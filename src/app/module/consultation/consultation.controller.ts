import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ConsultationService } from "./consultation.service";

export const bookConsultation = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.bookConsultation(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation booked. Payment session generated.",
    data: result,
  });
});

export const bookPayLater = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.bookPayLater(req.user!, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation booked under pay-later terms (valid for 30 minutes).",
    data: result,
  });
});

export const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.initiatePayment(req.params.id as string, req.user!);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment session initiated for consultation",
    data: result,
  });
});

export const getMyConsultations = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.getMyConsultations(req.user!, req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getAllConsultations = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.getAllConsultations(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative consultations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getConsultationById = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.getConsultationById(req.user!, req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation details retrieved successfully",
    data: result,
  });
});

export const updateConsultationStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.updateConsultationStatus(
    req.user!,
    req.params.id as string,
    req.body.status,
    req.body.reason
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation status transitioned successfully",
    data: result,
  });
});

export const createAdvice = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.createAdvice(req.user!, req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Legal advice note recorded successfully",
    data: result,
  });
});

export const updateAdvice = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.updateAdvice(req.user!, req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Legal advice note updated successfully",
    data: result,
  });
});

export const getAdvice = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.getAdvice(req.user!, req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Legal advice note retrieved successfully",
    data: result,
  });
});

export const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.uploadDocument(req.user!, req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation document uploaded successfully",
    data: result,
  });
});

export const getDocuments = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.getDocuments(req.user!, req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation documents retrieved and access logged",
    data: result,
  });
});

export const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const result = await ConsultationService.deleteDocument(
    req.user!,
    req.params.id as string,
    req.params.docId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation document deleted successfully",
    data: result,
  });
});

export const ConsultationController = {
  bookConsultation,
  bookPayLater,
  initiatePayment,
  getMyConsultations,
  getAllConsultations,
  getConsultationById,
  updateConsultationStatus,
  createAdvice,
  updateAdvice,
  getAdvice,
  uploadDocument,
  getDocuments,
  deleteDocument,
};

export default ConsultationController;
