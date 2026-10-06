import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ReviewService } from "./review.service";

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation review submitted successfully",
    data: result,
  });
});

export const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Moderation review list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const updateVisibility = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateVisibility(
    req.user!,
    req.params.id as string,
    req.body.isHidden
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review visibility updated successfully",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getAllReviews,
  updateVisibility,
};

export default ReviewController;
