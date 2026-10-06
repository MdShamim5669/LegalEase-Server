import { describe, it, expect } from "vitest";
import { renderTemplate, sendEmail } from "../utils/email";
import { AppError } from "../errorHelpers/AppError";

describe("EJS Templates & Email Utility", () => {
  describe("otp.ejs template", () => {
    it("renders OTP verification email with provided parameters", async () => {
      const html = await renderTemplate("otp", {
        name: "Rahim Ahmed",
        otp: "592814",
        expiresInMinutes: 15,
        appName: "LegalEase",
        supportEmail: "support@legalease.com",
      });

      expect(html).toContain("Rahim Ahmed");
      expect(html).toContain("592814");
      expect(html).toContain("15 minutes");
      expect(html).toContain("LegalEase");
      expect(html).toContain("support@legalease.com");
      expect(html).toContain("Security Notice");
    });

    it("falls back to default values when optional fields are omitted", async () => {
      const html = await renderTemplate("otp", {
        otp: "123456",
      });

      expect(html).toContain("Valued User");
      expect(html).toContain("123456");
      expect(html).toContain("10 minutes");
      expect(html).toContain("LegalEase");
    });
  });

  describe("invitation.ejs template", () => {
    it("renders lawyer invitation with temporary password and activation button", async () => {
      const html = await renderTemplate("invitation", {
        lawyerName: "Kazi Nazrul",
        email: "advocate.kazi@example.com",
        temporaryPassword: "TempPassword!2026",
        loginUrl: "https://legalease.com/auth/login",
        appName: "LegalEase",
        supportEmail: "helpdesk@legalease.com",
      });

      expect(html).toContain("Adv. Kazi Nazrul");
      expect(html).toContain("advocate.kazi@example.com");
      expect(html).toContain("TempPassword!2026");
      expect(html).toContain("https://legalease.com/auth/login");
      expect(html).toContain("Log In & Set Password");
      expect(html).toContain("Official Practitioner Invitation");
    });
  });

  describe("bookingConfirmed.ejs template", () => {
    it("renders consultation confirmation with date, time in BST, fee and meeting room link", async () => {
      const html = await renderTemplate("bookingConfirmed", {
        clientName: "Tariqul Islam",
        lawyerName: "Sabrina Yasmin",
        consultationId: "con_9876543210",
        appointmentDate: "October 15, 2026",
        appointmentTime: "04:30 PM - 05:00 PM (BST)",
        consultationType: "Property Dispute Consultation (30 mins)",
        amount: "2,000 BDT",
        meetingLink: "https://meet.legalease.com/rooms/con_9876543210",
        instructions: "Please have your land deed document scanned and ready.",
        appName: "LegalEase",
        supportEmail: "support@legalease.com",
      });

      expect(html).toContain("Tariqul Islam");
      expect(html).toContain("Adv. Sabrina Yasmin");
      expect(html).toContain("con_9876543210");
      expect(html).toContain("October 15, 2026");
      expect(html).toContain("04:30 PM - 05:00 PM (BST)");
      expect(html).toContain("2,000 BDT");
      expect(html).toContain("https://meet.legalease.com/rooms/con_9876543210");
      expect(html).toContain("Please have your land deed document scanned and ready.");
      expect(html).toContain("Payment & Booking Confirmed");
    });
  });

  describe("googleRedirect.ejs template", () => {
    it("renders OAuth success redirect screen with token passing and spinner", async () => {
      const html = await renderTemplate("googleRedirect", {
        token: "sample_jwt_access_token_123",
        refreshToken: "sample_jwt_refresh_token_456",
        redirectUrl: "http://localhost:3000/auth/callback",
        appName: "LegalEase",
        user: { name: "Test User", email: "test@example.com" },
      });

      expect(html).toContain("Signing You In");
      expect(html).toContain("sample_jwt_access_token_123");
      expect(html).toContain("sample_jwt_refresh_token_456");
      expect(html).toContain("http://localhost:3000/auth/callback");
      expect(html).toContain("GOOGLE_AUTH_SUCCESS");
    });

    it("renders OAuth error state when authentication fails", async () => {
      const html = await renderTemplate("googleRedirect", {
        error: "Google account email unverified",
        redirectUrl: "http://localhost:3000/login?error=oauth",
      });

      expect(html).toContain("Authentication Failed");
      expect(html).toContain("Google account email unverified");
      expect(html).toContain("Return to Login");
    });
  });

  describe("Error handling and dispatch", () => {
    it("throws AppError TEMPLATE_NOT_FOUND when non-existent template is requested", async () => {
      await expect(
        renderTemplate("unknown" as any, {} as any)
      ).rejects.toThrow(AppError);
    });

    it("dispatches email with template using json transport in test environment", async () => {
      const result = await sendEmail({
        to: "client@example.com",
        subject: "Your OTP Verification Code",
        template: "otp",
        data: {
          name: "Client",
          otp: "112233",
        },
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });
  });
});
