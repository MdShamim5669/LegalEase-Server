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

// Trust proxy for reverse proxies and tunnels (e.g., localtunnel, ngrok, load balancers)
app.set("trust proxy", 1);

const allowedOrigins = [
  env.FRONTEND_URL,
  env.API_URL,
  "https://dash.better-auth.com",
];

// Security and CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".loca.lt") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
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
