import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { toNodeHandler } from "better-auth/node";
import { dash } from "@better-auth/infra";
import prisma from "./prisma";
import env from "../config/env";

/**
 * Better Auth initialization configured with Prisma adapter for PostgreSQL.
 * Manages User, Session, Account, and Verification models (PRD Section 1.7, 7, 8, Decision D8).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.API_URL,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (PRD Section 8)
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [env.FRONTEND_URL, env.API_URL],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    dash(),
  ],
});

export const authHandler = toNodeHandler(auth);

export default auth;
