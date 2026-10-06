import { ConsultationType, ConsultationStatus } from "../../../generated/prisma/enums.js";

export interface IBookConsultationPayload {
  lawyerId: string;
  scheduleId: string;
  type?: ConsultationType;
  topic?: string;
}

export interface IUpdateConsultationStatusPayload {
  status: ConsultationStatus;
  reason?: string;
}

export interface ICreateAdvicePayload {
  summary: string;
  nextSteps?: string;
  followUpDate?: Date;
}

export interface IUpdateAdvicePayload {
  summary?: string;
  nextSteps?: string;
  followUpDate?: Date;
}

export interface IUploadDocumentPayload {
  title: string;
  fileUrl: string;
  publicId: string;
  sizeBytes: number;
}
