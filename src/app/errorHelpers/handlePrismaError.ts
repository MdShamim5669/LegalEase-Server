import status from "http-status";
import { IGenericErrorResponse } from "./handleZodError";

interface PrismaErrorWithMeta {
  code?: string;
  message?: string;
  meta?: {
    target?: string[] | string;
    cause?: string;
  };
}

export const handlePrismaClientError = (error: PrismaErrorWithMeta): IGenericErrorResponse => {
  let statusCode: number = status.BAD_REQUEST;
  let message = "Database Error";
  let code = "DATABASE_ERROR";
  let errorSources = [{ path: "", message: error.message || "Database error occurred" }];

  if (error.code === "P2002") {
    statusCode = status.CONFLICT;
    code = "DUPLICATE_RESOURCE";
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : typeof error.meta?.target === "string"
      ? error.meta.target
      : "field";
    message = `Duplicate entry for ${target}`;
    errorSources = [{ path: target, message: `A record with this ${target} already exists.` }];
  } else if (error.code === "P2025") {
    statusCode = status.NOT_FOUND;
    code = "RESOURCE_NOT_FOUND";
    message = error.meta?.cause || "Record not found.";
  }

  return { statusCode, code, message, errorSources };
};
