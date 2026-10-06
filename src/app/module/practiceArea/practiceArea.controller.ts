import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PracticeAreaService } from "./practiceArea.service";

export const getAllPracticeAreas = catchAsync(async (_req: Request, res: Response) => {
  const result = await PracticeAreaService.getAllPracticeAreas();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice areas retrieved successfully",
    data: result,
  });
});

export const createPracticeArea = catchAsync(async (req: Request, res: Response) => {
  const result = await PracticeAreaService.createPracticeArea(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Practice area created successfully",
    data: result,
  });
});

export const updatePracticeArea = catchAsync(async (req: Request, res: Response) => {
  const result = await PracticeAreaService.updatePracticeArea(req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice area updated successfully",
    data: result,
  });
});

export const deletePracticeArea = catchAsync(async (req: Request, res: Response) => {
  const result = await PracticeAreaService.deletePracticeArea(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice area deleted successfully",
    data: result,
  });
});

export const PracticeAreaController = {
  getAllPracticeAreas,
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
};

export default PracticeAreaController;
