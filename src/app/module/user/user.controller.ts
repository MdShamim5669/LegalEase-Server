import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const createLawyer = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Lawyer invitation dispatched successfully",
    data: req.body,
  });
});

export const createAdmin = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Admin created successfully",
    data: req.body,
  });
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `User status updated to ${req.body.status}`,
    data: { id: req.params.id, status: req.body.status },
  });
});

export const UserController = {
  createLawyer,
  createAdmin,
  updateStatus,
};
