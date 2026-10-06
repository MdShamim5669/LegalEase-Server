import { ZodError } from "zod";
import status from "http-status";

export interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  errorSources: Array<{ path: string; message: string }>;
}

export const handleZodError = (error: ZodError): IGenericErrorResponse => {
  const errorSources = error.issues.map((issue) => ({
    path: issue.path[issue.path.length - 1]?.toString() || "unknown",
    message: issue.message,
  }));

  return {
    statusCode: status.BAD_REQUEST,
    code: "VALIDATION_ERROR",
    message: "Validation Error",
    errorSources,
  };
};
