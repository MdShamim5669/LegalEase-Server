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
  BETTER_AUTH_API_KEY: z.string().optional(),
  BETTER_AUTH_IDENTIFY_URL: z.string().optional(),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  SUPER_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default("AdminSecurePassword123!"),
  STRIPE_SECRET_KEY: z.string().default("sk_test_placeholder_key"),
  STRIPE_WEBHOOK_SECRET: z.string().default("whsec_placeholder_secret"),
  PAYMENT_CURRENCY: z.string().default("bdt"),
  PAYMENT_GATEWAY_PROVIDER: z.enum(["STRIPE", "SSLCOMMERZ", "MOCK"]).default("STRIPE"),
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASS: z.string().optional(),
  SSLCOMMERZ_IS_LIVE: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .optional(),
  STORE_ID: z.string().optional(),
  STORE_PASSWORD: z.string().optional(),
  SSL_IS_LIVE: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .optional(),
  PAYMENT_GATEWAY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  EMAIL_SENDER_SMTP_HOST: z.string().default("smtp.example.com"),
  EMAIL_SENDER_SMTP_PORT: z.coerce.number().default(587),
  EMAIL_SENDER_SMTP_USER: z.string().default("your_smtp_user"),
  EMAIL_SENDER_SMTP_PASS: z.string().default("your_smtp_password"),
  EMAIL_SENDER_SMTP_FROM: z.string().default("LegalEase <no-reply@legalease.com>"),
  GITHUB_CLIENT_ID: z.string().default("dummy_github_client_id"),
  GITHUB_CLIENT_SECRET: z.string().default("dummy_github_client_secret"),
});

export const validateEnv = (raw: Record<string, unknown>) => {
  const parsed = envSchema.parse(raw);
  return {
    ...parsed,
    SSLCOMMERZ_STORE_ID: parsed.SSLCOMMERZ_STORE_ID || parsed.STORE_ID || "test_store_id",
    SSLCOMMERZ_STORE_PASS: parsed.SSLCOMMERZ_STORE_PASS || parsed.STORE_PASSWORD || "test_store_pass",
    SSLCOMMERZ_IS_LIVE: parsed.SSLCOMMERZ_IS_LIVE ?? parsed.SSL_IS_LIVE ?? false,
  };
};

export const env = validateEnv(process.env);
export default env;
