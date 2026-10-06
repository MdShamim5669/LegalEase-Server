import express, { Request, Response } from "express";
import status from "http-status";
import { sendResponse } from "../shared/sendResponse";

const router = express.Router();

router.get("/health", (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "LegalEase API is healthy",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export const RootRouter = router;
export default RootRouter;
