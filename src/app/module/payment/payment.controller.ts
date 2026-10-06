import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = (req.headers["stripe-signature"] as string) || "";
  const result = await PaymentService.handleWebhook(req.body, signature);
  res.status(status.OK).json(result);
});

export const sslCommerzSuccess = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.handleSSLCommerzSuccess(req.body);
  if (result.redirectUrl) {
    res.redirect(result.redirectUrl);
    return;
  }
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "SSLCommerz payment validated successfully",
    data: result,
  });
});

export const sslCommerzFail = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.handleSSLCommerzFail(req.body);
  if (result.redirectUrl) {
    res.redirect(result.redirectUrl);
    return;
  }
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: false,
    message: "SSLCommerz payment failed",
    data: result,
  });
});

export const sslCommerzCancel = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.handleSSLCommerzCancel(req.body);
  if (result.redirectUrl) {
    res.redirect(result.redirectUrl);
    return;
  }
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: false,
    message: "SSLCommerz payment cancelled by user",
    data: result,
  });
});

export const sslCommerzIpn = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.handleSSLCommerzIpn(req.body);
  res.status(status.OK).json(result);
});

export const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.refundPayment(
    req.user!,
    req.params.id as string,
    req.body?.reason
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund processed successfully",
    data: result,
  });
});

export const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayments(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payments metadata retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const PaymentController = {
  handleWebhook,
  sslCommerzSuccess,
  sslCommerzFail,
  sslCommerzCancel,
  sslCommerzIpn,
  refundPayment,
  getAllPayments,
};

export default PaymentController;
