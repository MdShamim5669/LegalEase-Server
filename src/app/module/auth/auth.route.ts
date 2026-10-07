import express from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { authLimiter, otpLimiter } from "../../middleware/rateLimit";

const router = express.Router();

/**
 * Authentication & session routes (PRD Section 6).
 */
router.post(
  "/register",
  authLimiter,
  validateRequest(AuthValidation.registerSchema),
  AuthController.register
);

router.post(
  "/login",
  authLimiter,
  validateRequest(AuthValidation.loginSchema),
  AuthController.login
);

router.post(
  "/verify-email",
  otpLimiter,
  validateRequest(AuthValidation.verifyEmailSchema),
  AuthController.verifyEmail
);

router.post(
  "/resend-otp",
  otpLimiter,
  validateRequest(AuthValidation.resendOtpSchema),
  AuthController.resendOtp
);

router.post(
  "/forget-password",
  otpLimiter,
  validateRequest(AuthValidation.forgetPasswordSchema),
  AuthController.forgetPassword
);

router.post(
  "/reset-password",
  otpLimiter,
  validateRequest(AuthValidation.resetPasswordSchema),
  AuthController.resetPassword
);

router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", checkAuth(), AuthController.logout);

router.post(
  "/change-password",
  checkAuth(),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthController.changePassword
);

router.get("/me", checkAuth(), AuthController.getMe);
router.get("/login/google", AuthController.loginGoogle);
router.get("/google/success", AuthController.googleSuccess);

export const AuthRoutes = router;
export default AuthRoutes;
