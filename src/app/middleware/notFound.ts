import { Request, Response, NextFunction } from "express";
import status from "http-status";
import { AppError } from "../errorHelpers/AppError";

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(status.NOT_FOUND, `Route not found: ${req.originalUrl}`, "NOT_FOUND"));
};
