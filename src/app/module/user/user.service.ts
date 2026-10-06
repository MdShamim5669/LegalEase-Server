import crypto from "crypto";
import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { Role, UserStatus, Gender } from "../../../generated/prisma/enums.js";
import { sendEmail } from "../../utils/email";
import env from "../../config/env";

export const createLawyer = async (
  _adminUser: IAuthUser,
  payload: {
    name: string;
    email: string;
    contactNumber: string;
    gender: Gender;
    barCouncilNo: string;
    consultationFee: number;
    experience?: number;
    chamberAddress?: string;
    practiceAreaIds?: string[];
  }
) => {
  // Check duplicate email or barCouncilNo (Rule BL-17)
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new AppError(status.CONFLICT, "User email already registered", "EMAIL_EXISTS");
  }

  const existingLawyer = await prisma.lawyer.findFirst({
    where: { barCouncilNo: payload.barCouncilNo },
  });
  if (existingLawyer) {
    throw new AppError(status.CONFLICT, "Bar Council Number already registered", "BAR_COUNCIL_EXISTS");
  }

  const temporaryPassword = `Temp!${crypto.randomBytes(6).toString("hex")}`;

  // Multi-step write transaction (Rule 12 in prisma-and-data.md)
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        role: Role.LAWYER,
        needPasswordChange: true,
        emailVerified: false,
      },
    });

    const lawyer = await tx.lawyer.create({
      data: {
        userId: user.id,
        name: payload.name,
        email: payload.email,
        contactNumber: payload.contactNumber,
        gender: payload.gender,
        barCouncilNo: payload.barCouncilNo,
        consultationFee: Math.round(payload.consultationFee),
        experience: payload.experience || 0,
        chamberAddress: payload.chamberAddress,
        isVerified: false,
      },
    });

    if (payload.practiceAreaIds && payload.practiceAreaIds.length > 0) {
      await tx.lawyerPracticeArea.createMany({
        data: payload.practiceAreaIds.map((paId) => ({
          lawyerId: lawyer.id,
          practiceAreaId: paId,
        })),
      });
    }

    return { user, lawyer };
  });

  // Outside transaction: send invitation email with temporary password (Rule BL-17)
  try {
    await sendEmail({
      to: payload.email,
      subject: "Invitation to Join LegalEase as Legal Consultant",
      template: "invitation",
      data: {
        lawyerName: payload.name,
        email: payload.email,
        temporaryPassword,
        loginUrl: `${env.FRONTEND_URL}/login`,
      },
    });
  } catch (_err) {
    // Non-blocking warning flag per Rule BL-17
  }

  return {
    user: result.user,
    lawyer: result.lawyer,
  };
};

export const createAdmin = async (
  _superAdminUser: IAuthUser,
  payload: {
    name: string;
    email: string;
    contactNumber?: string;
  }
) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new AppError(status.CONFLICT, "User email already registered", "EMAIL_EXISTS");
  }

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        role: Role.ADMIN,
        needPasswordChange: true,
        emailVerified: true,
      },
    });

    const admin = await tx.admin.create({
      data: {
        userId: user.id,
        name: payload.name,
        email: payload.email,
        contactNumber: payload.contactNumber,
      },
    });

    return { user, admin };
  });
};

export const updateUserStatus = async (
  _adminUser: IAuthUser,
  userId: string,
  newStatus: UserStatus
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found", "USER_NOT_FOUND");
  }

  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, "Super Admin status cannot be altered", "FORBIDDEN");
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });
};

export const UserService = {
  createLawyer,
  createAdmin,
  updateUserStatus,
};

export default UserService;
