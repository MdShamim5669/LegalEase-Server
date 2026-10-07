import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import env from "./app/config/env";
import { authHandler } from "./app/lib/auth";
import { generalLimiter } from "./app/middleware/rateLimit";
import { RootRouter } from "./app/routes";
import { notFound } from "./app/middleware/notFound";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";

const app: Application = express();

// Security and CORS
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(generalLimiter);

// Parsers
app.use(cookieParser());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Better Auth API Route (PRD Section 1.7 & Neon Auth)
app.use("/api/auth", authHandler);

// Application API Routes
app.use("/api/v1", RootRouter);

// 404 Handler (BEFORE error handler)
app.use(notFound);

// Central Global Error Handler
app.use(globalErrorHandler);

export default app;
