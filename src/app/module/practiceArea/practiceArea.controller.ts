import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const getAllPracticeAreas = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice areas retrieved successfully",
    data: [],
  });
});

export const createPracticeArea = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Practice area created successfully",
    data: req.body,
  });
});

export const updatePracticeArea = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice area updated successfully",
    data: { id: req.params.id, ...req.body },
  });
});

export const deletePracticeArea = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Practice area deleted successfully",
    data: { id: req.params.id },
  });
});

export const PracticeAreaController = {
  getAllPracticeAreas,
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
};
