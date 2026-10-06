import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import env from "../config/env";
import { AppError } from "../errorHelpers/AppError";
import { handleZodError } from "../errorHelpers/handleZodError";
import { handlePrismaClientError } from "../errorHelpers/handlePrismaError";

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_SERVER_ERROR";
  let errorSources: Array<{ path: string; message: string }> = [];

  if (err instanceof ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode;
    code = simplified.code;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err?.name?.includes("PrismaClient") || err?.code?.startsWith("P")) {
    const simplified = handlePrismaClientError(err);
    statusCode = simplified.statusCode;
    code = simplified.code;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    errorSources = err.errorSources || [{ path: "", message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [{ path: "", message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    errorSources,
    stack: env.NODE_ENV === "development" ? err.stack : null,
  });
};
