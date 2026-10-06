import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import env from "./app/config/env";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", RootRouter);

// 404 Handler (BEFORE error handler)
app.use(notFound);

// Central Global Error Handler
app.use(globalErrorHandler);

export default app;
