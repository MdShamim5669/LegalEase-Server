import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuditService } from "./audit.service";

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditService.getAuditLogs(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AuditController = {
  getAuditLogs,
};

export default AuditController;
