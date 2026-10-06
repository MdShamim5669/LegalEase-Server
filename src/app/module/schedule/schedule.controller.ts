import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ScheduleService } from "./schedule.service";

export const createSchedule = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.createSchedules(req.body.slots);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Schedules generated successfully",
    data: result,
  });
});

export const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.getAllSchedules(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Schedules retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getScheduleById = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.getScheduleById(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Schedule details retrieved successfully",
    data: result,
  });
});

export const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.updateSchedule(req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Schedule updated successfully",
    data: result,
  });
});

export const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.deleteSchedule(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Schedule deleted successfully",
    data: result,
  });
});

export const ScheduleController = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};

export default ScheduleController;
