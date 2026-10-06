import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const pickSlots = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Slots assigned to lawyer schedule successfully",
    data: req.body,
  });
});

export const getMySlots = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer schedule slots retrieved successfully",
    data: { lawyerId: req.user?.userId, slots: [] },
  });
});

export const removeSlot = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Slot removed from lawyer schedule successfully",
    data: { scheduleId: req.params.scheduleId },
  });
});

export const LawyerScheduleController = {
  pickSlots,
  getMySlots,
  removeSlot,
};
