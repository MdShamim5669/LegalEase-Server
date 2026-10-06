import status from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../errorHelpers/AppError";
import { IAuthUser } from "../../interfaces/auth.interface";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import { generateToken, verifyToken } from "../../utils/jwt";
import { sendEmail } from "../../utils/email";
import env from "../../config/env";

export const registerClient = async (payload: {
  name: string;
  email: string;
  password?: string;
  contactNumber?: string;
}) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new AppError(status.CONFLICT, "An account with this email already exists", "EMAIL_EXISTS");
  }

  // Generate 6-digit OTP (Rule 6 in security.md)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { user, client } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        role: Role.CLIENT,
        emailVerified: false,
        status: UserStatus.ACTIVE,
      },
    });

    const c = await tx.client.create({
      data: {
        userId: u.id,
        name: payload.name,
        email: payload.email,
        contactNumber: payload.contactNumber,
      },
    });

    if (payload.password) {
      await tx.account.create({
        data: {
          accountId: u.id,
          providerId: "credential",
          userId: u.id,
          password: payload.password, // In live, betterAuth handles hashing
        },
      });
    }

    await tx.verification.create({
      data: {
        identifier: payload.email,
        value: otp,
        expiresAt,
      },
    });

    return { user: u, client: c };
  });

  // Outside transaction: send OTP email (Rule BL-3)
  try {
    await sendEmail({
      to: payload.email,
      subject: "Verify Your Email - LegalEase",
      template: "otp",
      data: {
        name: payload.name,
        otp,
        expiresInMinutes: 10,
      },
    });
  } catch (_err) {
    // Non-blocking email delivery
  }

  return { user, client, message: "Verification OTP dispatched" };
};

export const login = async (payload: { email: string; password?: string }) => {
  const user = await prisma.user.findFirst({
    where: { email: payload.email, isDeleted: false },
  });

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or credentials", "INVALID_CREDENTIALS");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "Your account has been suspended", "USER_BLOCKED");
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  const accessToken = generateToken(tokenPayload, env.ACCESS_TOKEN_SECRET, env.ACCESS_TOKEN_EXPIRES_IN);
  const refreshToken = generateToken(tokenPayload, env.REFRESH_TOKEN_SECRET, env.REFRESH_TOKEN_EXPIRES_IN);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      needPasswordChange: user.needPasswordChange,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  };
};

export const verifyEmail = async (payload: { email: string; otp: string }) => {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: payload.email,
      value: payload.otp,
      expiresAt: { gte: new Date() },
    },
  });

  if (!verification) {
    throw new AppError(status.BAD_REQUEST, "Invalid or expired verification code", "INVALID_OTP");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { email: payload.email },
      data: { emailVerified: true },
    });

    await tx.verification.delete({
      where: { id: verification.id },
    });
  });

  return { email: payload.email, verified: true };
};

export const resendOtp = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email, isDeleted: false },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User account not found", "USER_NOT_FOUND");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verification.create({
    data: {
      identifier: email,
      value: otp,
      expiresAt,
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "New Verification Code - LegalEase",
      template: "otp",
      data: {
        name: user.name,
        otp,
        expiresInMinutes: 10,
      },
    });
  } catch (_err) {
    // Non-blocking
  }

  return { email, sent: true };
};

export const forgetPassword = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email, isDeleted: false },
  });

  if (!user) {
    // Return success to avoid email enumeration
    return { email, sent: true };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verification.create({
    data: {
      identifier: email,
      value: otp,
      expiresAt,
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "Password Reset Request - LegalEase",
      template: "otp",
      data: {
        name: user.name,
        otp,
        expiresInMinutes: 10,
      },
    });
  } catch (_err) {
    // Non-blocking
  }

  return { email, sent: true };
};

export const resetPassword = async (payload: { email: string; otp: string; newPassword: string }) => {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: payload.email,
      value: payload.otp,
      expiresAt: { gte: new Date() },
    },
  });

  if (!verification) {
    throw new AppError(status.BAD_REQUEST, "Invalid or expired reset code", "INVALID_OTP");
  }

  const user = await prisma.user.findFirst({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found", "USER_NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.upsert({
      where: { id: user.id },
      update: { password: payload.newPassword },
      create: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: payload.newPassword,
      },
    });

    await tx.verification.delete({
      where: { id: verification.id },
    });
  });

  return { email: payload.email, passwordReset: true };
};

export const refreshToken = async (token: string) => {
  let decoded: any;
  try {
    decoded = verifyToken(token, env.REFRESH_TOKEN_SECRET);
  } catch (_err) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token is invalid or expired", "TOKEN_EXPIRED");
  }

  const user = await prisma.user.findFirst({
    where: { id: decoded.userId, isDeleted: false, status: UserStatus.ACTIVE },
  });

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "User session is no longer active", "USER_INACTIVE");
  }

  const accessToken = generateToken(
    { userId: user.id, email: user.email, role: user.role, status: user.status },
    env.ACCESS_TOKEN_SECRET,
    env.ACCESS_TOKEN_EXPIRES_IN
  );

  return { accessToken };
};

export const changePassword = async (
  userId: string,
  payload: { newPassword: string }
) => {
  await prisma.$transaction(async (tx) => {
    await tx.account.upsert({
      where: { id: userId },
      update: { password: payload.newPassword },
      create: {
        accountId: userId,
        providerId: "credential",
        userId,
        password: payload.newPassword,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { needPasswordChange: false },
    });
  });

  return { success: true };
};

export const getMe = async (user: IAuthUser) => {
  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      client: true,
      lawyer: true,
      admin: true,
    },
  });

  if (!profile) {
    throw new AppError(status.NOT_FOUND, "User profile not found", "USER_NOT_FOUND");
  }

  return profile;
};

export const AuthService = {
  registerClient,
  login,
  verifyEmail,
  resendOtp,
  forgetPassword,
  resetPassword,
  refreshToken,
  changePassword,
  getMe,
};

export default AuthService;
