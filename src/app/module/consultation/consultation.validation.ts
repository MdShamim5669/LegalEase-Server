import { z } from "zod";

const bookConsultationSchema = z.object({
  body: z.object({
    lawyerId: z.string({ required_error: "Lawyer ID is required" }),
    scheduleId: z.string({ required_error: "Schedule ID is required" }),
    type: z.enum(["VIDEO", "CHAMBER", "PHONE"]).optional(),
    topic: z.string().max(255, "Topic must not exceed 255 characters").optional(),
  }),
});

const updateStatusSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Consultation ID is required" }),
  }),
  body: z.object({
    status: z.enum(["SCHEDULED", "INPROGRESS", "COMPLETED", "CANCELED"], {
      required_error: "Status is required",
    }),
    reason: z.string().optional(),
  }),
});

const createAdviceSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Consultation ID is required" }),
  }),
  body: z.object({
    summary: z.string({ required_error: "Advice summary is required" }).min(5),
    nextSteps: z.string().optional(),
    followUpDate: z.string().optional(),
  }),
});

const updateAdviceSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Consultation ID is required" }),
  }),
  body: z.object({
    summary: z.string().min(5).optional(),
    nextSteps: z.string().optional(),
    followUpDate: z.string().optional(),
  }),
});

const uploadDocumentSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Consultation ID is required" }),
  }),
  body: z.object({
    title: z.string({ required_error: "Document title is required" }).min(2),
    fileUrl: z.string({ required_error: "File URL is required" }).url(),
    publicId: z.string({ required_error: "Public ID is required" }),
    sizeBytes: z.number().int().positive().max(5 * 1024 * 1024, "File size must not exceed 5MB"),
  }),
});

export const ConsultationValidation = {
  bookConsultationSchema,
  updateStatusSchema,
  createAdviceSchema,
  updateAdviceSchema,
  uploadDocumentSchema,
};

export default ConsultationValidation;
