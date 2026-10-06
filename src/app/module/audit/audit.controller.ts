import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const getAuditLogs = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const AuditController = {
  getAuditLogs,
};
