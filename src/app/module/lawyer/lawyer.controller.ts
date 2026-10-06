import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { LawyerService } from "./lawyer.service";

export const getVerifiedLawyers = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.getVerifiedLawyers(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Verified lawyers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getTopLawyers = catchAsync(async (_req: Request, res: Response) => {
  const result = await LawyerService.getTopLawyers();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top-rated lawyers retrieved successfully",
    data: result,
  });
});

export const getAdminLawyerList = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.getAdminLawyerList(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative lawyer directory retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getLawyerById = catchAsync(async (req: Request, res: Response) => {
  const isInternalAdmin = req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";
  const result = await LawyerService.getLawyerById(req.params.id as string, isInternalAdmin);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer details retrieved successfully",
    data: result,
  });
});

export const getLawyerSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.getLawyerSlots(
    req.params.id as string,
    req.query.from as string,
    req.query.to as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Available slots retrieved successfully",
    data: result,
  });
});

export const getLawyerReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.getLawyerReviews(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer reviews retrieved successfully",
    data: result,
  });
});

export const updateLawyer = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.updateLawyer(req.user!, req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer profile updated successfully",
    data: result,
  });
});

export const verifyLawyer = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.verifyLawyer(req.user!, req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer verification updated successfully",
    data: result,
  });
});

export const deleteLawyer = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerService.deleteLawyer(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer deleted successfully",
    data: result,
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

export default LawyerController;
