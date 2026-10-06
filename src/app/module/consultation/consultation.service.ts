import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { Role, ConsultationType, ConsultationStatus } from "../../../generated/prisma/enums.js";
import { getPaymentGateway } from "../../gateway/gateway.factory";

export const LEGAL_DISCLAIMER =
  "This is preliminary consultation, not formal legal representation.";

export const ALLOWED_STATUS_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  SCHEDULED: [ConsultationStatus.INPROGRESS, ConsultationStatus.CANCELED],
  INPROGRESS: [ConsultationStatus.COMPLETED],
  COMPLETED: [],
  CANCELED: [],
};

export const bookConsultation = async (
  clientUser: IAuthUser,
  payload: {
    lawyerId: string;
    scheduleId: string;
    type?: ConsultationType;
    topic?: string;
    gateway?: "STRIPE" | "SSLCOMMERZ";
  }
) => {
  const client = await prisma.client.findFirst({
    where: { userId: clientUser.userId, isDeleted: false },
  });
  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  const activeGateway = getPaymentGateway(payload.gateway);

  // 1. Atomic booking transaction (Rule 2 & 9 in booking-and-payments.md)
  const txResult = await prisma.$transaction(async (tx) => {
    const lawyer = await tx.lawyer.findFirst({
      where: { id: payload.lawyerId, isVerified: true, isDeleted: false },
    });
    if (!lawyer) {
      throw new AppError(status.NOT_FOUND, "Lawyer is either unverified or not found", "LAWYER_NOT_FOUND");
    }

    const locked = await tx.lawyerSchedule.updateMany({
      where: {
        lawyerId: payload.lawyerId,
        scheduleId: payload.scheduleId,
        isBooked: false,
      },
      data: { isBooked: true },
    });

    if (locked.count === 0) {
      throw new AppError(status.CONFLICT, "Slot already booked by another party", "SLOT_ALREADY_BOOKED");
    }

    const videoCallingId = `room_${Date.now()}_${payload.scheduleId.slice(0, 8)}`;
    const consultation = await tx.consultation.create({
      data: {
        clientId: client.id,
        lawyerId: payload.lawyerId,
        scheduleId: payload.scheduleId,
        type: payload.type || ConsultationType.VIDEO,
        status: ConsultationStatus.SCHEDULED,
        paymentStatus: "UNPAID",
        videoCallingId,
        topic: payload.topic,
      },
    });

    const transactionId = `txn_${Date.now()}_${consultation.id.slice(0, 8)}`;
    const payment = await tx.payment.create({
      data: {
        consultationId: consultation.id,
        amount: lawyer.consultationFee,
        status: "UNPAID",
        transactionId,
        paymentGatewayData: { provider: activeGateway.providerName },
      },
    });

    return { consultation, payment, lawyer };
  });

  // 2. Checkout session created OUTSIDE transaction (Rule BL-3)
  const session = await activeGateway.createCheckoutSession({
    consultationId: txResult.consultation.id,
    paymentId: txResult.payment.id,
    amount: txResult.payment.amount,
    clientEmail: clientUser.email,
    clientName: client.name,
    lawyerName: txResult.lawyer.name,
  });

  return {
    consultation: txResult.consultation,
    sessionId: session.sessionId,
    paymentUrl: session.url,
    gateway: activeGateway.providerName,
    disclaimer: LEGAL_DISCLAIMER,
  };
};

export const bookPayLater = async (
  clientUser: IAuthUser,
  payload: {
    lawyerId: string;
    scheduleId: string;
    type?: ConsultationType;
    topic?: string;
  }
) => {
  const client = await prisma.client.findFirst({
    where: { userId: clientUser.userId, isDeleted: false },
  });
  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const lawyer = await tx.lawyer.findFirst({
      where: { id: payload.lawyerId, isVerified: true, isDeleted: false },
    });
    if (!lawyer) {
      throw new AppError(status.NOT_FOUND, "Lawyer is either unverified or not found", "LAWYER_NOT_FOUND");
    }

    const locked = await tx.lawyerSchedule.updateMany({
      where: {
        lawyerId: payload.lawyerId,
        scheduleId: payload.scheduleId,
        isBooked: false,
      },
      data: { isBooked: true },
    });

    if (locked.count === 0) {
      throw new AppError(status.CONFLICT, "Slot already booked by another party", "SLOT_ALREADY_BOOKED");
    }

    const videoCallingId = `room_${Date.now()}_${payload.scheduleId.slice(0, 8)}`;
    const consultation = await tx.consultation.create({
      data: {
        clientId: client.id,
        lawyerId: payload.lawyerId,
        scheduleId: payload.scheduleId,
        type: payload.type || ConsultationType.VIDEO,
        status: ConsultationStatus.SCHEDULED,
        paymentStatus: "UNPAID",
        videoCallingId,
        topic: payload.topic,
      },
    });

    const transactionId = `txn_${Date.now()}_${consultation.id.slice(0, 8)}`;
    await tx.payment.create({
      data: {
        consultationId: consultation.id,
        amount: lawyer.consultationFee,
        status: "UNPAID",
        transactionId,
      },
    });

    return consultation;
  });

  return {
    consultation: txResult,
    disclaimer: LEGAL_DISCLAIMER,
  };
};

export const initiatePayment = async (
  consultationId: string,
  clientUser: IAuthUser,
  gatewayChoice?: "STRIPE" | "SSLCOMMERZ"
) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { payment: true, lawyer: true },
  });

  if (!consultation || !consultation.payment) {
    throw new AppError(status.NOT_FOUND, "Consultation or payment record not found", "NOT_FOUND");
  }

  if (consultation.paymentStatus === "PAID") {
    throw new AppError(status.BAD_REQUEST, "Consultation is already paid", "ALREADY_PAID");
  }

  const activeGateway = getPaymentGateway(gatewayChoice);
  const session = await activeGateway.createCheckoutSession({
    consultationId: consultation.id,
    paymentId: consultation.payment.id,
    amount: consultation.payment.amount,
    clientEmail: clientUser.email,
    lawyerName: consultation.lawyer.name,
  });

  return {
    consultationId,
    paymentUrl: session.url,
    sessionId: session.sessionId,
    gateway: activeGateway.providerName,
  };
};

export const getMyConsultations = async (user: IAuthUser, query: { page?: number | string; limit?: number | string }) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (user.role === Role.CLIENT) {
    const client = await prisma.client.findFirst({ where: { userId: user.userId, isDeleted: false } });
    if (!client) return { meta: { page, limit, total: 0, totalPages: 0 }, data: [] };
    where.clientId = client.id;
  } else if (user.role === Role.LAWYER) {
    const lawyer = await prisma.lawyer.findFirst({ where: { userId: user.userId, isDeleted: false } });
    if (!lawyer) return { meta: { page, limit, total: 0, totalPages: 0 }, data: [] };
    where.lawyerId = lawyer.id;
  }

  const [data, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, email: true, profilePhoto: true } },
        lawyer: { select: { name: true, email: true, profilePhoto: true, barCouncilNo: true } },
        payment: true,
      },
    }),
    prisma.consultation.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getAllConsultations = async (query: { page?: number | string; limit?: number | string }) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.consultation.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        payment: { select: { id: true, amount: true, status: true, transactionId: true } },
      },
    }),
    prisma.consultation.count(),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getConsultationById = async (user: IAuthUser, id: string) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, userId: true, name: true, email: true } },
      lawyer: { select: { id: true, userId: true, name: true, email: true } },
      payment: true,
      advice: true,
    },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "CONSULTATION_NOT_FOUND");
  }

  // Confidentiality Check (Rule 1 & 8)
  const isClient = consultation.client.userId === user.userId;
  const isLawyer = consultation.lawyer.userId === user.userId;
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

  if (!isClient && !isLawyer && !isAdmin) {
    throw new AppError(status.FORBIDDEN, "Access to this consultation record is restricted", "FORBIDDEN");
  }

  return {
    ...consultation,
    disclaimer: LEGAL_DISCLAIMER,
  };
};

export const updateConsultationStatus = async (
  user: IAuthUser,
  id: string,
  newStatus: ConsultationStatus,
  reason?: string
) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "CONSULTATION_NOT_FOUND");
  }

  // Status Transition Validation (Rule 27 in booking-and-payments.md)
  const currentStatus = consultation.status;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot transition consultation from ${currentStatus} to ${newStatus}`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.consultation.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === ConsultationStatus.COMPLETED && { completedAt: new Date() }),
        ...(newStatus === ConsultationStatus.CANCELED && {
          canceledAt: new Date(),
          canceledBy: user.role,
          cancelReason: reason,
        }),
      },
    });

    if (newStatus === ConsultationStatus.CANCELED) {
      await tx.lawyerSchedule.updateMany({
        where: { lawyerId: consultation.lawyerId, scheduleId: consultation.scheduleId },
        data: { isBooked: false },
      });
    }

    return updated;
  });
};

export const createAdvice = async (
  user: IAuthUser,
  consultationId: string,
  payload: { summary: string; nextSteps?: string; followUpDate?: Date }
) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { lawyer: true },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "NOT_FOUND");
  }

  if (consultation.lawyer.userId !== user.userId) {
    throw new AppError(status.FORBIDDEN, "Only the assigned consultant can author advice", "FORBIDDEN");
  }

  return await prisma.legalAdvice.create({
    data: {
      consultationId,
      summary: payload.summary,
      nextSteps: payload.nextSteps,
      followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : null,
    },
  });
};

export const updateAdvice = async (
  user: IAuthUser,
  consultationId: string,
  payload: { summary?: string; nextSteps?: string; followUpDate?: Date }
) => {
  const advice = await prisma.legalAdvice.findUnique({
    where: { consultationId },
    include: { consultation: { include: { lawyer: true } } },
  });

  if (!advice) {
    throw new AppError(status.NOT_FOUND, "Advice note not found", "NOT_FOUND");
  }

  if (advice.consultation.lawyer.userId !== user.userId) {
    throw new AppError(status.FORBIDDEN, "Only the authoring consultant can edit advice", "FORBIDDEN");
  }

  // 24 hour edit window constraint
  const hoursSinceCreation = (Date.now() - new Date(advice.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    throw new AppError(status.BAD_REQUEST, "Advice notes cannot be modified after 24 hours", "WINDOW_EXPIRED");
  }

  return await prisma.legalAdvice.update({
    where: { consultationId },
    data: {
      ...payload,
      ...(payload.followUpDate && { followUpDate: new Date(payload.followUpDate) }),
    },
  });
};

export const getAdvice = async (user: IAuthUser, consultationId: string) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { client: true, lawyer: true },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "NOT_FOUND");
  }

  const isClient = consultation.client.userId === user.userId;
  const isLawyer = consultation.lawyer.userId === user.userId;

  if (!isClient && !isLawyer) {
    throw new AppError(status.FORBIDDEN, "Advice notes are confidential to client and counsel", "FORBIDDEN");
  }

  const advice = await prisma.legalAdvice.findUnique({
    where: { consultationId },
  });

  if (!advice) {
    throw new AppError(status.NOT_FOUND, "No advice record issued yet", "ADVICE_NOT_FOUND");
  }

  return { ...advice, disclaimer: LEGAL_DISCLAIMER };
};

export const uploadDocument = async (
  user: IAuthUser,
  consultationId: string,
  payload: { title: string; fileUrl: string; publicId: string; sizeBytes: number }
) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { client: true },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "NOT_FOUND");
  }

  if (consultation.client.userId !== user.userId) {
    throw new AppError(status.FORBIDDEN, "Only the booked client can upload case files", "FORBIDDEN");
  }

  return await prisma.caseDocument.create({
    data: {
      consultationId,
      clientId: consultation.client.id,
      title: payload.title,
      fileUrl: payload.fileUrl,
      publicId: payload.publicId,
      sizeBytes: payload.sizeBytes,
    },
  });
};

export const getDocuments = async (user: IAuthUser, consultationId: string) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { client: true, lawyer: true },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation not found", "NOT_FOUND");
  }

  const isClient = consultation.client.userId === user.userId;
  const isLawyer = consultation.lawyer.userId === user.userId;
  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

  if (!isClient && !isLawyer && !isAdmin) {
    throw new AppError(status.FORBIDDEN, "Case files are protected by attorney-client privilege", "FORBIDDEN");
  }

  // Log audit if admin accesses documents (Rule 10 in privacy-and-legal.md)
  if (isAdmin) {
    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        actorRole: user.role,
        action: "DOCUMENT_ACCESS_AUDIT",
        entity: "CONSULTATION_DOCUMENTS",
        entityId: consultationId,
        reason: "Administrative oversight inspection",
      },
    });
  }

  return await prisma.caseDocument.findMany({
    where: { consultationId },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteDocument = async (user: IAuthUser, consultationId: string, docId: string) => {
  const doc = await prisma.caseDocument.findUnique({
    where: { id: docId },
    include: { client: true, consultation: true },
  });

  if (!doc || doc.consultationId !== consultationId) {
    throw new AppError(status.NOT_FOUND, "Document not found", "NOT_FOUND");
  }

  if (doc.client.userId !== user.userId) {
    throw new AppError(status.FORBIDDEN, "Only the document owner can remove files", "FORBIDDEN");
  }

  return await prisma.caseDocument.delete({
    where: { id: docId },
  });
};

export const ConsultationService = {
  bookConsultation,
  bookPayLater,
  initiatePayment,
  getMyConsultations,
  getAllConsultations,
  getConsultationById,
  updateConsultationStatus,
  createAdvice,
  updateAdvice,
  getAdvice,
  uploadDocument,
  getDocuments,
  deleteDocument,
};

export default ConsultationService;
