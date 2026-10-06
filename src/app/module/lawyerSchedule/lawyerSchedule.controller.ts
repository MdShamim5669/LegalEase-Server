import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { LawyerScheduleService } from "./lawyerSchedule.service";

export const pickSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerScheduleService.pickSlots(req.user!.userId, req.body.scheduleIds);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Slots assigned to lawyer schedule successfully",
    data: result,
  });
});

export const getMySlots = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerScheduleService.getMySlots(req.user!.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer schedule slots retrieved successfully",
    data: result,
  });
});

export const removeSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await LawyerScheduleService.removeSlot(req.user!.userId, req.params.scheduleId as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Slot removed from lawyer schedule successfully",
    data: result,
  });
});

export const LawyerScheduleController = {
  pickSlots,
  getMySlots,
  removeSlot,
};

export default LawyerScheduleController;
