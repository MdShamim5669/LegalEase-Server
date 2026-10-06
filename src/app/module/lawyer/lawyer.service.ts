import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { Role } from "../../../generated/prisma/enums.js";

export const getVerifiedLawyers = async (query: {
  page?: number | string;
  limit?: number | string;
  searchTerm?: string;
  practiceAreaId?: string;
  gender?: string;
  maxFee?: number | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
    isVerified: true,
  };

  if (query.searchTerm) {
    where.OR = [
      { name: { contains: query.searchTerm, mode: "insensitive" } },
      { bio: { contains: query.searchTerm, mode: "insensitive" } },
      { chamberAddress: { contains: query.searchTerm, mode: "insensitive" } },
    ];
  }

  if (query.practiceAreaId) {
    where.practiceAreas = {
      some: { practiceAreaId: query.practiceAreaId },
    };
  }

  if (query.gender) {
    where.gender = query.gender;
  }

  if (query.maxFee) {
    where.consultationFee = { lte: Number(query.maxFee) };
  }

  const orderBy: any = {};
  if (query.sortBy === "rating") {
    orderBy.averageRating = query.sortOrder || "desc";
  } else if (query.sortBy === "fee") {
    orderBy.consultationFee = query.sortOrder || "asc";
  } else if (query.sortBy === "experience") {
    orderBy.experience = query.sortOrder || "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, total] = await Promise.all([
    prisma.lawyer.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        practiceAreas: {
          include: { practiceArea: true },
        },
      },
    }),
    prisma.lawyer.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getTopLawyers = async () => {
  return await prisma.lawyer.findMany({
    where: { isDeleted: false, isVerified: true },
    take: 6,
    orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }],
    include: {
      practiceAreas: {
        include: { practiceArea: true },
      },
    },
  });
};

export const getAdminLawyerList = async (query: {
  page?: number | string;
  limit?: number | string;
  isVerified?: string | boolean;
}) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };
  if (query.isVerified !== undefined) {
    where.isVerified = query.isVerified === "true" || query.isVerified === true;
  }

  const [data, total] = await Promise.all([
    prisma.lawyer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, status: true, createdAt: true } },
        practiceAreas: { include: { practiceArea: true } },
      },
    }),
    prisma.lawyer.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getLawyerById = async (id: string, isInternalAdmin: boolean = false) => {
  const where: any = { id, isDeleted: false };
  if (!isInternalAdmin) {
    where.isVerified = true;
  }

  const lawyer = await prisma.lawyer.findFirst({
    where,
    include: {
      practiceAreas: { include: { practiceArea: true } },
    },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found or unverified", "LAWYER_NOT_FOUND");
  }

  return lawyer;
};

export const getLawyerSlots = async (
  lawyerId: string,
  from?: string,
  to?: string
) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, isDeleted: false, isVerified: true },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found or unverified", "LAWYER_NOT_FOUND");
  }

  const whereSchedule: any = {
    startDateTime: { gte: from ? new Date(from) : new Date() },
  };
  if (to) {
    whereSchedule.endDateTime = { lte: new Date(to) };
  }

  return await prisma.lawyerSchedule.findMany({
    where: {
      lawyerId,
      isBooked: false,
      schedule: whereSchedule,
    },
    include: { schedule: true },
    orderBy: { schedule: { startDateTime: "asc" } },
  });
};

export const getLawyerReviews = async (lawyerId: string) => {
  return await prisma.review.findMany({
    where: {
      lawyerId,
      isHidden: false,
    },
    include: {
      client: { select: { name: true, profilePhoto: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateLawyer = async (
  actor: IAuthUser,
  lawyerId: string,
  payload: any
) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found", "LAWYER_NOT_FOUND");
  }

  // Self-ownership check if actor is lawyer
  if (actor.role === Role.LAWYER && lawyer.userId !== actor.userId) {
    throw new AppError(status.FORBIDDEN, "You can only update your own lawyer profile", "FORBIDDEN");
  }

  return await prisma.lawyer.update({
    where: { id: lawyerId },
    data: payload,
  });
};

export const verifyLawyer = async (
  admin: IAuthUser,
  lawyerId: string,
  payload: { isVerified: boolean; verificationNote?: string }
) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found", "LAWYER_NOT_FOUND");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.lawyer.update({
      where: { id: lawyerId },
      data: {
        isVerified: payload.isVerified,
        verifiedAt: payload.isVerified ? new Date() : null,
        verificationNote: payload.verificationNote,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: admin.role,
        action: payload.isVerified ? "LAWYER_VERIFIED" : "LAWYER_VERIFICATION_REVOKED",
        entity: "LAWYER",
        entityId: lawyerId,
        reason: payload.verificationNote,
      },
    });

    return res;
  });

  return updated;
};

export const deleteLawyer = async (lawyerId: string) => {
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, isDeleted: false },
  });

  if (!lawyer) {
    throw new AppError(status.NOT_FOUND, "Lawyer not found", "LAWYER_NOT_FOUND");
  }

  return await prisma.$transaction(async (tx) => {
    const deleted = await tx.lawyer.update({
      where: { id: lawyerId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: lawyer.userId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return deleted;
  });
};

export const LawyerService = {
  getVerifiedLawyers,
  getTopLawyers,
  getAdminLawyerList,
  getLawyerById,
  getLawyerSlots,
  getLawyerReviews,
  updateLawyer,
  verifyLawyer,
  deleteLawyer,
};

export default LawyerService;
