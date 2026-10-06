import express from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = express.Router();

/**
 * Authentication & session routes (PRD Section 6).
 */
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/resend-otp", AuthController.resendOtp);
router.post("/forget-password", AuthController.forgetPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", checkAuth(), AuthController.logout);
router.post("/change-password", checkAuth(), AuthController.changePassword);
router.get("/me", checkAuth(), AuthController.getMe);
router.get("/login/google", AuthController.loginGoogle);
router.get("/google/success", AuthController.googleSuccess);

export const AuthRoutes = router;
export default AuthRoutes;
