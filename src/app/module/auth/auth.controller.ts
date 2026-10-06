import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerClient(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Registration initiated. Verification OTP dispatched to email.",
    data: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Login successful",
    data: result,
  });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyEmail(req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email address verified successfully",
    data: result,
  });
});

export const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resendOtp(req.body.email);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Verification code dispatched successfully",
    data: result,
  });
});

export const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgetPassword(req.body.email);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset instructions dispatched",
    data: result,
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset successfully",
    data: result,
  });
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  const result = await AuthService.refreshToken(token);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(req.user!.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getMe(req.user!);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Current user profile retrieved successfully",
    data: result,
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
    message: "Google OAuth authenticated successfully",
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

export default AuthController;
