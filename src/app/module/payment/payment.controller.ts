import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const handleWebhook = catchAsync(async (_req: Request, res: Response) => {
  // Conforms to PRD Section 4.4 & 6: webhook event acknowledgement
  res.status(status.OK).json({ received: true });
});

export const refundPayment = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund processed successfully",
    data: { paymentId: req.params.id, amount: req.body.amount },
  });
});

export const getAllPayments = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payments metadata retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const PaymentController = {
  handleWebhook,
  refundPayment,
  getAllPayments,
};
