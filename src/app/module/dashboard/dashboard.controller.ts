import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DashboardService } from "./dashboard.service";

export const getClientDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getClientDashboard(req.user!.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client dashboard data retrieved successfully",
    data: result,
  });
});

export const getLawyerDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getLawyerDashboard(req.user!.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer dashboard data retrieved successfully",
    data: result,
  });
});

export const getAdminDashboard = catchAsync(async (_req: Request, res: Response) => {
  const result = await DashboardService.getAdminDashboard();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative stats retrieved successfully",
    data: result,
  });
});

export const DashboardController = {
  getClientDashboard,
  getLawyerDashboard,
  getAdminDashboard,
};

export default DashboardController;
