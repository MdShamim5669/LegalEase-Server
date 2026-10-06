import { z } from "zod";

const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters"),
    email: z.string({ required_error: "Email is required" }).email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    contactNumber: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email("Invalid email address"),
    password: z.string().optional(),
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6, "OTP must be 6 digits"),
  }),
});

const resendOtpSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
  }),
});

const forgetPasswordSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email(),
    otp: z.string({ required_error: "OTP is required" }).length(6, "OTP must be 6 digits"),
    newPassword: z.string({ required_error: "New password is required" }).min(8, "Password must be at least 8 characters"),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().optional(),
    newPassword: z.string({ required_error: "New password is required" }).min(8, "Password must be at least 8 characters"),
  }),
});

export const AuthValidation = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};

export default AuthValidation;
