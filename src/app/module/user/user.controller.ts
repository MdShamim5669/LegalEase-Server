import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

export const createLawyer = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createLawyer(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Lawyer created and invitation dispatched successfully",
    data: result,
  });
});

export const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createAdmin(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserStatus(req.user!, req.params.id as string, req.body.status);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `User status updated to ${req.body.status}`,
    data: result,
  });
});

export const UserController = {
  createLawyer,
  createAdmin,
  updateStatus,
};

export default UserController;
