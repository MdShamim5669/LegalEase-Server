import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const getClientDashboard = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Client dashboard data retrieved successfully",
    data: { userId: req.user?.userId, upcomingConsultations: [], pastConsultations: [] },
  });
});

export const getLawyerDashboard = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Lawyer dashboard data retrieved successfully",
    data: { lawyerId: req.user?.userId, todayConsultations: [], totalEarned: 0 },
  });
});

export const getAdminDashboard = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative stats retrieved successfully",
    data: { totalUsers: 0, totalConsultations: 0, revenue: 0 },
  });
});

export const DashboardController = {
  getClientDashboard,
  getLawyerDashboard,
  getAdminDashboard,
};
