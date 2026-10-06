import express from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

/**
 * Authentication & session routes (PRD Section 6).
 */
router.post(
  "/register",
  validateRequest(AuthValidation.registerSchema),
  AuthController.register
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginSchema),
  AuthController.login
);

router.post(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmailSchema),
  AuthController.verifyEmail
);

router.post(
  "/resend-otp",
  validateRequest(AuthValidation.resendOtpSchema),
  AuthController.resendOtp
);

router.post(
  "/forget-password",
  validateRequest(AuthValidation.forgetPasswordSchema),
  AuthController.forgetPassword
);

router.post(
  "/reset-password",
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
