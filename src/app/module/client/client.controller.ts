import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client profile retrieved successfully",
    data: { user: req.user },
  });
});

export const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client profile updated successfully",
    data: req.body,
  });
});

export const deleteMyProfile = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client account deleted successfully",
    data: null,
  });
});

export const ClientController = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};
