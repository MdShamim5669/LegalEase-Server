import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { ConsultationStatus } from "../../../generated/prisma/enums.js";

export const createReview = async (
  clientUser: IAuthUser,
  payload: { consultationId: string; rating: number; comment?: string }
) => {
  const client = await prisma.client.findFirst({
    where: { userId: clientUser.userId, isDeleted: false },
  });

  if (!client) {
    throw new AppError(status.NOT_FOUND, "Client profile not found", "CLIENT_NOT_FOUND");
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: payload.consultationId },
    include: { review: true },
  });

  if (!consultation) {
    throw new AppError(status.NOT_FOUND, "Consultation record not found", "CONSULTATION_NOT_FOUND");
  }

  if (consultation.clientId !== client.id) {
    throw new AppError(status.FORBIDDEN, "Only the booked client can review this consultation", "FORBIDDEN");
  }

  if (consultation.status !== ConsultationStatus.COMPLETED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Reviews can only be submitted for completed consultations",
      "CONSULTATION_NOT_COMPLETED"
    );
  }

  if (consultation.review) {
    throw new AppError(status.CONFLICT, "A review has already been submitted for this session", "ALREADY_REVIEWED");
  }

  if (payload.rating < 1 || payload.rating > 5) {
    throw new AppError(status.BAD_REQUEST, "Rating must be an integer between 1 and 5", "INVALID_RATING");
  }

  // Multi-step transaction with aggregate recalculation (Rule 17 in prisma-and-data.md)
  return await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        consultationId: payload.consultationId,
        clientId: client.id,
        lawyerId: consultation.lawyerId,
        rating: Math.round(payload.rating),
        comment: payload.comment,
      },
    });

    const aggregate = await tx.review.aggregate({
      where: { lawyerId: consultation.lawyerId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.lawyer.update({
      where: { id: consultation.lawyerId },
      data: {
        averageRating: aggregate._avg.rating || 0,
        reviewCount: aggregate._count.rating || 0,
      },
    });

    return review;
  });
};

export const getAllReviews = async (query: {
  page?: number | string;
  limit?: number | string;
  lawyerId?: string;
  isHidden?: boolean | string;
}) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.lawyerId) where.lawyerId = query.lawyerId;
  if (query.isHidden !== undefined) {
    where.isHidden = query.isHidden === "true" || query.isHidden === true;
  }

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, profilePhoto: true } },
        lawyer: { select: { name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const updateVisibility = async (
  _adminUser: IAuthUser,
  reviewId: string,
  isHidden: boolean
) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found", "REVIEW_NOT_FOUND");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: { isHidden },
    });

    const aggregate = await tx.review.aggregate({
      where: { lawyerId: review.lawyerId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.lawyer.update({
      where: { id: review.lawyerId },
      data: {
        averageRating: aggregate._avg.rating || 0,
        reviewCount: aggregate._count.rating || 0,
      },
    });

    return updated;
  });
};

export const ReviewService = {
  createReview,
  getAllReviews,
  updateVisibility,
};

export default ReviewService;
