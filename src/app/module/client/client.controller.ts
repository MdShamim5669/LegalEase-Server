import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ClientService } from "./client.service";

export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientService.getMyProfile(req.user!.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client profile retrieved successfully",
    data: result,
  });
});

export const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientService.updateMyProfile(req.user!.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client profile updated successfully",
    data: result,
  });
});

export const deleteMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientService.deleteMyProfile(req.user!.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client account deleted successfully",
    data: result,
  });
});

export const ClientController = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
};

export default ClientController;
