import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const bookConsultation = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation booked. Payment session generated.",
    data: { consultationId: "con_mock_123", paymentUrl: "https://checkout.stripe.com/...", ...req.body },
  });
});

export const bookPayLater = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation booked under pay-later terms (valid for 30 minutes).",
    data: { consultationId: "con_mock_123", status: "SCHEDULED", ...req.body },
  });
});

export const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment session initiated for consultation",
    data: { consultationId: req.params.id, paymentUrl: "https://checkout.stripe.com/..." },
  });
});

export const getMyConsultations = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultations retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const getAllConsultations = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Administrative consultations retrieved successfully",
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    data: [],
  });
});

export const getConsultationById = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation details retrieved successfully",
    data: { id: req.params.id },
  });
});

export const updateConsultationStatus = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation status transitioned successfully",
    data: { id: req.params.id, status: req.body.status },
  });
});

export const createAdvice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Legal advice note recorded successfully",
    data: { consultationId: req.params.id, ...req.body },
  });
});

export const updateAdvice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Legal advice note updated successfully",
    data: { consultationId: req.params.id, ...req.body },
  });
});

export const getAdvice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Legal advice note retrieved successfully",
    data: { consultationId: req.params.id },
  });
});

export const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Consultation document uploaded successfully",
    data: { consultationId: req.params.id, fileName: "document.pdf" },
  });
});

export const getDocuments = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation documents retrieved and access logged",
    data: { consultationId: req.params.id, documents: [] },
  });
});

export const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Consultation document deleted successfully",
    data: { consultationId: req.params.id, docId: req.params.docId },
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
