import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:5000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  SUPER_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default("AdminSecurePassword123!"),
});

export const validateEnv = (raw: Record<string, unknown>) => {
  return envSchema.parse(raw);
};

export const env = validateEnv(process.env);
export default env;
