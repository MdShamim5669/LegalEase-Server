import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const createReview = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation review submitted successfully",
    data: req.body,
  });
});

export const getAllReviews = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Moderation review list retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const updateVisibility = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review visibility updated successfully",
    data: { id: req.params.id, isVisible: req.body.isVisible },
  });
});

export const ReviewController = {
  createReview,
  getAllReviews,
  updateVisibility,
};
