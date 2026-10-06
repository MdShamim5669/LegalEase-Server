import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const getVerifiedLawyers = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Verified lawyers retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const getTopLawyers = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top-rated lawyers retrieved successfully",
    data: [],
  });
});

export const getAdminLawyerList = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative lawyer list retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const getLawyerById = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer details retrieved successfully",
    data: { id: req.params.id },
  });
});

export const getLawyerSlots = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Available slots retrieved successfully",
    data: { lawyerId: req.params.id, slots: [] },
  });
});

export const getLawyerReviews = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer reviews retrieved successfully",
    data: { lawyerId: req.params.id, reviews: [] },
  });
});

export const updateLawyer = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer profile updated successfully",
    data: { id: req.params.id, ...req.body },
  });
});

export const verifyLawyer = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer verification updated",
    data: { id: req.params.id, ...req.body },
  });
});

export const deleteLawyer = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer deleted successfully",
    data: { id: req.params.id },
  });
});

export const LawyerController = {
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
