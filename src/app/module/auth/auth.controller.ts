import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

export const register = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Registration initiated. Verification OTP sent.",
    data: { email: req.body.email },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Login successful",
    data: { user: req.body.email },
  });
});

export const verifyEmail = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email verified successfully",
    data: { verified: true },
  });
});

export const resendOtp = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "New OTP dispatched",
    data: null,
  });
});

export const forgetPassword = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset OTP dispatched",
    data: null,
  });
});

export const resetPassword = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset successfully",
    data: null,
  });
});

export const refreshToken = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken: "refreshed_token" },
  });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const changePassword = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: req.user || null,
  });
});

export const loginGoogle = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Google OAuth initiated",
    data: { url: "/api/v1/auth/google/success" },
  });
});

export const googleSuccess = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Google OAuth completed",
    data: { authenticated: true },
  });
});

export const AuthController = {
  register,
  login,
  verifyEmail,
  resendOtp,
  forgetPassword,
  resetPassword,
  refreshToken,
  logout,
  changePassword,
  getMe,
  loginGoogle,
  googleSuccess,
};
