import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { Role } from "../src/generated/prisma/enums.js";

// 1. Bypass Rate Limiters during API testing
vi.mock("../src/app/middleware/rateLimit", () => ({
  generalLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  otpLimiter: (_req: any, _res: any, next: any) => next(),
}));

// 2. Mock all Domain Services with default successful mock implementations
vi.mock("../src/app/module/auth/auth.service", () => ({
  AuthService: {
    registerClient: vi.fn().mockResolvedValue({ userId: "u1", email: "client@test.com" }),
    login: vi.fn().mockResolvedValue({
      accessToken: "mock_access",
      refreshToken: "mock_refresh",
      user: { id: "u1", email: "client@test.com", role: Role.CLIENT },
    }),
    verifyEmail: vi.fn().mockResolvedValue({ emailVerified: true }),
    resendOtp: vi.fn().mockResolvedValue({ message: "OTP sent" }),
    forgetPassword: vi.fn().mockResolvedValue({ message: "Reset code sent" }),
    resetPassword: vi.fn().mockResolvedValue({ message: "Password updated" }),
    refreshToken: vi.fn().mockResolvedValue({ accessToken: "new_access_token" }),
    changePassword: vi.fn().mockResolvedValue({ message: "Password changed" }),
    getMe: vi.fn().mockResolvedValue({ id: "u1", email: "client@test.com", role: Role.CLIENT }),
  },
}));

vi.mock("../src/app/module/user/user.service", () => ({
  UserService: {
    createLawyer: vi.fn().mockResolvedValue({ id: "l1", name: "Advocate Rahman" }),
    createAdmin: vi.fn().mockResolvedValue({ id: "a1", name: "Admin Khan" }),
    updateUserStatus: vi.fn().mockResolvedValue({ id: "u1", status: "BLOCKED" }),
  },
}));

vi.mock("../src/app/module/client/client.service", () => ({
  ClientService: {
    getMyProfile: vi.fn().mockResolvedValue({ id: "c1", name: "Client John" }),
    updateMyProfile: vi.fn().mockResolvedValue({ id: "c1", name: "Updated John" }),
    deleteMyProfile: vi.fn().mockResolvedValue({ message: "Account deleted" }),
  },
}));

vi.mock("../src/app/module/admin/admin.service", () => ({
  AdminService: {
    getAllAdmins: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getAdminById: vi.fn().mockResolvedValue({ id: "a1", name: "Admin 1" }),
    updateAdmin: vi.fn().mockResolvedValue({ id: "a1", name: "Updated Admin" }),
    deleteAdmin: vi.fn().mockResolvedValue({ message: "Admin deleted" }),
  },
}));

vi.mock("../src/app/module/lawyer/lawyer.service", () => ({
  LawyerService: {
    getVerifiedLawyers: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getTopLawyers: vi.fn().mockResolvedValue([]),
    getAdminLawyerList: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getLawyerById: vi.fn().mockResolvedValue({ id: "l1", name: "Advocate Rahman", isVerified: true }),
    getLawyerSlots: vi.fn().mockResolvedValue([]),
    getLawyerReviews: vi.fn().mockResolvedValue([]),
    updateLawyer: vi.fn().mockResolvedValue({ id: "l1", name: "Advocate Updated" }),
    verifyLawyer: vi.fn().mockResolvedValue({ id: "l1", isVerified: true }),
    deleteLawyer: vi.fn().mockResolvedValue({ message: "Lawyer deleted" }),
  },
}));

vi.mock("../src/app/module/practiceArea/practiceArea.service", () => ({
  PracticeAreaService: {
    getAllPracticeAreas: vi.fn().mockResolvedValue([]),
    createPracticeArea: vi.fn().mockResolvedValue({ id: "pa1", name: "Criminal Law" }),
    updatePracticeArea: vi.fn().mockResolvedValue({ id: "pa1", name: "Updated Law" }),
    deletePracticeArea: vi.fn().mockResolvedValue({ message: "Practice area deleted" }),
  },
}));

vi.mock("../src/app/module/schedule/schedule.service", () => ({
  ScheduleService: {
    createSchedule: vi.fn().mockResolvedValue({ count: 1 }),
    createSchedules: vi.fn().mockResolvedValue({ count: 1 }),
    getAllSchedules: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getScheduleById: vi.fn().mockResolvedValue({ id: "s1" }),
    updateSchedule: vi.fn().mockResolvedValue({ id: "s1" }),
    deleteSchedule: vi.fn().mockResolvedValue({ message: "Schedule deleted" }),
  },
}));

vi.mock("../src/app/module/lawyerSchedule/lawyerSchedule.service", () => ({
  LawyerScheduleService: {
    pickSlots: vi.fn().mockResolvedValue({ count: 2 }),
    getMySlots: vi.fn().mockResolvedValue([]),
    removeSlot: vi.fn().mockResolvedValue({ message: "Slot removed" }),
  },
}));

vi.mock("../src/app/module/consultation/consultation.service", () => ({
  ConsultationService: {
    bookConsultation: vi.fn().mockResolvedValue({ consultation: { id: "c1" }, paymentSession: {} }),
    bookPayLater: vi.fn().mockResolvedValue({ id: "c1", status: "SCHEDULED" }),
    initiatePayment: vi.fn().mockResolvedValue({ gatewayUrl: "https://checkout.stripe.com" }),
    getMyConsultations: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getAllConsultations: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    getConsultationById: vi.fn().mockResolvedValue({ id: "c1", topic: "Civil case" }),
    updateConsultationStatus: vi.fn().mockResolvedValue({ id: "c1", status: "COMPLETED" }),
    createAdvice: vi.fn().mockResolvedValue({ id: "adv1", summary: "Legal advice" }),
    updateAdvice: vi.fn().mockResolvedValue({ id: "adv1", summary: "Updated advice" }),
    getAdvice: vi.fn().mockResolvedValue({ id: "adv1", summary: "Legal advice" }),
    uploadDocument: vi.fn().mockResolvedValue({ id: "doc1", title: "Evidence.pdf" }),
    getDocuments: vi.fn().mockResolvedValue([]),
    deleteDocument: vi.fn().mockResolvedValue({ message: "Document deleted" }),
  },
}));

vi.mock("../src/app/module/payment/payment.service", () => ({
  PaymentService: {
    handleWebhook: vi.fn().mockResolvedValue({ received: true }),
    handleSSLCommerzSuccess: vi.fn().mockResolvedValue({ redirectUrl: "http://localhost:3000/success" }),
    handleSSLCommerzFail: vi.fn().mockResolvedValue({ redirectUrl: "http://localhost:3000/fail" }),
    handleSSLCommerzCancel: vi.fn().mockResolvedValue({ redirectUrl: "http://localhost:3000/cancel" }),
    handleSSLCommerzIpn: vi.fn().mockResolvedValue({ status: "VALIDATED" }),
    refundPayment: vi.fn().mockResolvedValue({ id: "p1", status: "REFUNDED" }),
    getAllPayments: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
  },
}));

vi.mock("../src/app/module/review/review.service", () => ({
  ReviewService: {
    createReview: vi.fn().mockResolvedValue({ id: "r1", rating: 5 }),
    getAllReviews: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
    updateVisibility: vi.fn().mockResolvedValue({ id: "r1", isHidden: false }),
  },
}));

vi.mock("../src/app/module/dashboard/dashboard.service", () => ({
  DashboardService: {
    getClientDashboard: vi.fn().mockResolvedValue({ totalBookings: 3 }),
    getLawyerDashboard: vi.fn().mockResolvedValue({ totalEarnings: 15000 }),
    getAdminDashboard: vi.fn().mockResolvedValue({ totalUsers: 100 }),
  },
}));

vi.mock("../src/app/module/audit/audit.service", () => ({
  AuditService: {
    getAuditLogs: vi.fn().mockResolvedValue({ meta: { page: 1, limit: 10, total: 1 }, data: [] }),
  },
}));

import app from "../src/app";
import { generateToken } from "../src/app/utils/jwt";
import env from "../src/app/config/env";

describe("SQA Comprehensive API Endpoints Test Suite", () => {
  // Helper JWT generator
  const createAuthHeader = (role: Role, userId = "user_123") => {
    const token = generateToken(
      { userId, email: `${role.toLowerCase()}@test.com`, role, status: "ACTIVE" },
      env.ACCESS_TOKEN_SECRET,
      "1h"
    );
    return `Bearer ${token}`;
  };

  const clientAuth = () => createAuthHeader(Role.CLIENT, "client_1");
  const lawyerAuth = () => createAuthHeader(Role.LAWYER, "lawyer_1");
  const adminAuth = () => createAuthHeader(Role.ADMIN, "admin_1");
  const superAdminAuth = () => createAuthHeader(Role.SUPER_ADMIN, "super_admin_1");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. HEALTH CHECK & 404
  // ==========================================
  describe("1. System & Health Routes", () => {
    it("GET /api/v1/health returns 200 and healthy metadata", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
    });

    it("GET /api/v1/non-existent returns 404 standard envelope", async () => {
      const res = await request(app).get("/api/v1/non-existent-endpoint");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

  // ==========================================
  // 2. AUTHENTICATION MODULE (/api/v1/auth)
  // ==========================================
  describe("2. Auth Module (/api/v1/auth)", () => {
    it("POST /api/v1/auth/register validates payload and returns 201", async () => {
      // Invalid: missing required fields
      const badRes = await request(app).post("/api/v1/auth/register").send({});
      expect(badRes.status).toBe(400);
      expect(badRes.body.success).toBe(false);

      // Valid
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ name: "Rahim", email: "rahim@test.com", password: "Password123!" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/auth/login validates payload, sets cookies and returns 200", async () => {
      const badRes = await request(app).post("/api/v1/auth/login").send({ email: "bad-email" });
      expect(badRes.status).toBe(400);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "rahim@test.com", password: "Password123!" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("POST /api/v1/auth/verify-email validates OTP length and returns 200", async () => {
      const badRes = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ email: "rahim@test.com", otp: "123" });
      expect(badRes.status).toBe(400);

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ email: "rahim@test.com", otp: "123456" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/auth/resend-otp validates email and returns 200", async () => {
      const res = await request(app)
        .post("/api/v1/auth/resend-otp")
        .send({ email: "rahim@test.com" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/auth/forget-password validates email and returns 200", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forget-password")
        .send({ email: "rahim@test.com" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/auth/reset-password validates payload and returns 200", async () => {
      const res = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ email: "rahim@test.com", otp: "123456", newPassword: "NewPassword123!" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/auth/refresh-token accepts body token and returns 200", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: "dummy_refresh_token" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/v1/auth/me enforces authentication guard", async () => {
      const unauth = await request(app).get("/api/v1/auth/me");
      expect(unauth.status).toBe(401);

      const auth = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", clientAuth());
      expect(auth.status).toBe(200);
      expect(auth.body.success).toBe(true);
    });

    it("POST /api/v1/auth/change-password enforces auth, validates password length", async () => {
      const unauth = await request(app).post("/api/v1/auth/change-password");
      expect(unauth.status).toBe(401);

      const invalid = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", clientAuth())
        .send({ newPassword: "123" });
      expect(invalid.status).toBe(400);

      const valid = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", clientAuth())
        .send({ newPassword: "NewValidPassword123!" });
      expect(valid.status).toBe(200);
    });

    it("POST /api/v1/auth/logout clears auth cookies and returns 200", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", clientAuth());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/v1/auth/login/google returns OAuth redirect url", async () => {
      const res = await request(app).get("/api/v1/auth/login/google");
      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeDefined();
    });

    it("GET /api/v1/auth/login/github returns GitHub OAuth redirect url", async () => {
      const res = await request(app).get("/api/v1/auth/login/github");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe("/api/v1/auth/github/success");
    });

    it("GET /api/v1/auth/github/success returns authenticated flag", async () => {
      const res = await request(app).get("/api/v1/auth/github/success");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authenticated).toBe(true);
    });
  });

  // ==========================================
  // 3. USER MANAGEMENT MODULE (/api/v1/users)
  // ==========================================
  describe("3. User Administration Module (/api/v1/users)", () => {
    it("POST /api/v1/users/create-lawyer enforces ADMIN/SUPER_ADMIN RBAC", async () => {
      const payload = {
        name: "Advocate Karim",
        email: "karim@bar.com",
        contactNumber: "01711111111",
        gender: "MALE",
        barCouncilNo: "BC-12345",
        consultationFee: 1500,
      };

      // Unauthenticated -> 401
      const unauth = await request(app).post("/api/v1/users/create-lawyer").send(payload);
      expect(unauth.status).toBe(401);

      // Forbidden for CLIENT -> 403
      const forbidden = await request(app)
        .post("/api/v1/users/create-lawyer")
        .set("Authorization", clientAuth())
        .send(payload);
      expect(forbidden.status).toBe(403);

      // Allowed for ADMIN -> 201
      const allowed = await request(app)
        .post("/api/v1/users/create-lawyer")
        .set("Authorization", adminAuth())
        .send(payload);
      expect(allowed.status).toBe(201);
      expect(allowed.body.success).toBe(true);
    });

    it("POST /api/v1/users/create-admin enforces SUPER_ADMIN RBAC strictly", async () => {
      const payload = {
        name: "Officer Admin",
        email: "admin2@legalease.com",
        contactNumber: "01722222222",
      };

      // ADMIN is forbidden -> 403
      const adminAttempt = await request(app)
        .post("/api/v1/users/create-admin")
        .set("Authorization", adminAuth())
        .send(payload);
      expect(adminAttempt.status).toBe(403);

      // SUPER_ADMIN allowed -> 201
      const superAdminAttempt = await request(app)
        .post("/api/v1/users/create-admin")
        .set("Authorization", superAdminAuth())
        .send(payload);
      expect(superAdminAttempt.status).toBe(201);
      expect(superAdminAttempt.body.success).toBe(true);
    });

    it("PATCH /api/v1/users/:id/status updates user status with ADMIN guard", async () => {
      const res = await request(app)
        .patch("/api/v1/users/user_1/status")
        .set("Authorization", adminAuth())
        .send({ status: "BLOCKED" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 4. CLIENT PROFILE MODULE (/api/v1/clients)
  // ==========================================
  describe("4. Client Profile Module (/api/v1/clients)", () => {
    it("GET /api/v1/clients/me allows only CLIENT", async () => {
      const forbidden = await request(app)
        .get("/api/v1/clients/me")
        .set("Authorization", lawyerAuth());
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get("/api/v1/clients/me")
        .set("Authorization", clientAuth());
      expect(allowed.status).toBe(200);
      expect(allowed.body.success).toBe(true);
    });

    it("PATCH /api/v1/clients/me updates profile with validation", async () => {
      const res = await request(app)
        .patch("/api/v1/clients/me")
        .set("Authorization", clientAuth())
        .send({ name: "Updated Name", contactNumber: "01811111111" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("DELETE /api/v1/clients/me deletes profile", async () => {
      const res = await request(app)
        .delete("/api/v1/clients/me")
        .set("Authorization", clientAuth());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 5. ADMIN MANAGEMENT MODULE (/api/v1/admins)
  // ==========================================
  describe("5. Admin Module (/api/v1/admins)", () => {
    it("GET /api/v1/admins requires SUPER_ADMIN", async () => {
      const forbidden = await request(app)
        .get("/api/v1/admins")
        .set("Authorization", adminAuth());
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get("/api/v1/admins")
        .set("Authorization", superAdminAuth());
      expect(allowed.status).toBe(200);
    });

    it("GET /api/v1/admins/:id requires SUPER_ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/admins/adm_1")
        .set("Authorization", superAdminAuth());
      expect(res.status).toBe(200);
    });

    it("PATCH /api/v1/admins/:id updates admin info", async () => {
      const res = await request(app)
        .patch("/api/v1/admins/adm_1")
        .set("Authorization", superAdminAuth())
        .send({ name: "Renamed Admin" });
      expect(res.status).toBe(200);
    });

    it("DELETE /api/v1/admins/:id deletes admin", async () => {
      const res = await request(app)
        .delete("/api/v1/admins/adm_1")
        .set("Authorization", superAdminAuth());
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 6. LAWYER DIRECTORY & MANAGEMENT (/api/v1/lawyers)
  // ==========================================
  describe("6. Lawyer Module (/api/v1/lawyers)", () => {
    it("Public lawyer endpoints return 200 without token", async () => {
      const list = await request(app).get("/api/v1/lawyers");
      expect(list.status).toBe(200);

      const top = await request(app).get("/api/v1/lawyers/top");
      expect(top.status).toBe(200);

      const detail = await request(app).get("/api/v1/lawyers/lawyer_1");
      expect(detail.status).toBe(200);

      const slots = await request(app).get("/api/v1/lawyers/lawyer_1/slots");
      expect(slots.status).toBe(200);

      const reviews = await request(app).get("/api/v1/lawyers/lawyer_1/reviews");
      expect(reviews.status).toBe(200);
    });

    it("GET /api/v1/lawyers/admin/list requires ADMIN", async () => {
      const forbidden = await request(app)
        .get("/api/v1/lawyers/admin/list")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get("/api/v1/lawyers/admin/list")
        .set("Authorization", adminAuth());
      expect(allowed.status).toBe(200);
    });

    it("PATCH /api/v1/lawyers/:id allows LAWYER or ADMIN", async () => {
      const res = await request(app)
        .patch("/api/v1/lawyers/lawyer_1")
        .set("Authorization", lawyerAuth())
        .send({ bio: "Expert in Commercial Arbitration" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("PATCH /api/v1/lawyers/:id/verify requires ADMIN", async () => {
      const forbidden = await request(app)
        .patch("/api/v1/lawyers/lawyer_1/verify")
        .set("Authorization", lawyerAuth())
        .send({ isVerified: true });
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .patch("/api/v1/lawyers/lawyer_1/verify")
        .set("Authorization", adminAuth())
        .send({ isVerified: true });
      expect(allowed.status).toBe(200);
    });

    it("DELETE /api/v1/lawyers/:id requires ADMIN", async () => {
      const res = await request(app)
        .delete("/api/v1/lawyers/lawyer_1")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 7. PRACTICE AREAS MODULE (/api/v1/practice-areas)
  // ==========================================
  describe("7. Practice Areas Module (/api/v1/practice-areas)", () => {
    it("GET /api/v1/practice-areas is public", async () => {
      const res = await request(app).get("/api/v1/practice-areas");
      expect(res.status).toBe(200);
    });

    it("POST /api/v1/practice-areas requires ADMIN with validation", async () => {
      const forbidden = await request(app)
        .post("/api/v1/practice-areas")
        .set("Authorization", clientAuth())
        .send({ title: "Taxation" });
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .post("/api/v1/practice-areas")
        .set("Authorization", adminAuth())
        .send({ title: "Taxation Law", icon: "https://example.com/icon.png" });
      expect(allowed.status).toBe(201);
    });

    it("PATCH /api/v1/practice-areas/:id requires ADMIN", async () => {
      const res = await request(app)
        .patch("/api/v1/practice-areas/pa_1")
        .set("Authorization", adminAuth())
        .send({ title: "Updated Area" });
      expect(res.status).toBe(200);
    });

    it("DELETE /api/v1/practice-areas/:id requires ADMIN", async () => {
      const res = await request(app)
        .delete("/api/v1/practice-areas/pa_1")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 8. SCHEDULES MODULE (/api/v1/schedules)
  // ==========================================
  describe("8. Universal Schedules Module (/api/v1/schedules)", () => {
    it("POST /api/v1/schedules creates slots with ADMIN guard", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", adminAuth())
        .send({
          slots: [
            {
              startDateTime: new Date("2026-10-10T10:00:00Z").toISOString(),
              endDateTime: new Date("2026-10-10T10:30:00Z").toISOString(),
            },
          ],
        });
      expect(res.status).toBe(201);
    });

    it("GET /api/v1/schedules requires LAWYER or ADMIN", async () => {
      const forbidden = await request(app)
        .get("/api/v1/schedules")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get("/api/v1/schedules")
        .set("Authorization", lawyerAuth());
      expect(allowed.status).toBe(200);
    });

    it("PATCH /api/v1/schedules/:id requires ADMIN", async () => {
      const res = await request(app)
        .patch("/api/v1/schedules/sched_1")
        .set("Authorization", adminAuth())
        .send({ startDateTime: new Date().toISOString() });
      expect(res.status).toBe(200);
    });

    it("DELETE /api/v1/schedules/:id requires ADMIN", async () => {
      const res = await request(app)
        .delete("/api/v1/schedules/sched_1")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 9. LAWYER SCHEDULES MODULE (/api/v1/lawyer-schedules)
  // ==========================================
  describe("9. Lawyer Schedules Module (/api/v1/lawyer-schedules)", () => {
    it("POST /api/v1/lawyer-schedules maps slots strictly for LAWYER", async () => {
      const forbidden = await request(app)
        .post("/api/v1/lawyer-schedules")
        .set("Authorization", clientAuth())
        .send({ scheduleIds: ["s1", "s2"] });
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .post("/api/v1/lawyer-schedules")
        .set("Authorization", lawyerAuth())
        .send({ scheduleIds: ["s1", "s2"] });
      expect(allowed.status).toBe(201);
    });

    it("GET /api/v1/lawyer-schedules/my returns lawyer's personal slots", async () => {
      const res = await request(app)
        .get("/api/v1/lawyer-schedules/my")
        .set("Authorization", lawyerAuth());
      expect(res.status).toBe(200);
    });

    it("DELETE /api/v1/lawyer-schedules/:scheduleId unmaps slot for LAWYER", async () => {
      const res = await request(app)
        .delete("/api/v1/lawyer-schedules/s1")
        .set("Authorization", lawyerAuth());
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 10. CONSULTATIONS MODULE (/api/v1/consultations)
  // ==========================================
  describe("10. Consultations Module (/api/v1/consultations)", () => {
    it("POST /api/v1/consultations/book allows CLIENT with valid schema", async () => {
      const badRes = await request(app)
        .post("/api/v1/consultations/book")
        .set("Authorization", clientAuth())
        .send({});
      expect(badRes.status).toBe(400);

      const res = await request(app)
        .post("/api/v1/consultations/book")
        .set("Authorization", clientAuth())
        .send({ lawyerId: "l1", scheduleId: "s1", type: "VIDEO" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/consultations/book-pay-later books consultation without immediate payment", async () => {
      const res = await request(app)
        .post("/api/v1/consultations/book-pay-later")
        .set("Authorization", clientAuth())
        .send({ lawyerId: "l1", scheduleId: "s1" });
      expect(res.status).toBe(201);
    });

    it("POST /api/v1/consultations/:id/pay initiates payment session", async () => {
      const res = await request(app)
        .post("/api/v1/consultations/c1/pay")
        .set("Authorization", clientAuth());
      expect(res.status).toBe(200);
    });

    it("GET /api/v1/consultations/my allows CLIENT and LAWYER", async () => {
      const clientRes = await request(app)
        .get("/api/v1/consultations/my")
        .set("Authorization", clientAuth());
      expect(clientRes.status).toBe(200);

      const lawyerRes = await request(app)
        .get("/api/v1/consultations/my")
        .set("Authorization", lawyerAuth());
      expect(lawyerRes.status).toBe(200);
    });

    it("GET /api/v1/consultations allows ADMIN oversight", async () => {
      const res = await request(app)
        .get("/api/v1/consultations")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
    });

    it("PATCH /api/v1/consultations/:id/status updates status with enum validation", async () => {
      const badStatus = await request(app)
        .patch("/api/v1/consultations/c1/status")
        .set("Authorization", lawyerAuth())
        .send({ status: "INVALID_STATUS" });
      expect(badStatus.status).toBe(400);

      const res = await request(app)
        .patch("/api/v1/consultations/c1/status")
        .set("Authorization", lawyerAuth())
        .send({ status: "COMPLETED" });
      expect(res.status).toBe(200);
    });

    it("Legal advice note endpoints (/advice) enforce LAWYER creation and retrieval", async () => {
      // POST Advice (Lawyer only)
      const postForbidden = await request(app)
        .post("/api/v1/consultations/c1/advice")
        .set("Authorization", clientAuth())
        .send({ summary: "Summary note" });
      expect(postForbidden.status).toBe(403);

      const postAllowed = await request(app)
        .post("/api/v1/consultations/c1/advice")
        .set("Authorization", lawyerAuth())
        .send({ summary: "Comprehensive preliminary legal advice note" });
      expect(postAllowed.status).toBe(201);

      // PATCH Advice
      const patchRes = await request(app)
        .patch("/api/v1/consultations/c1/advice")
        .set("Authorization", lawyerAuth())
        .send({ summary: "Updated advice details" });
      expect(patchRes.status).toBe(200);

      // GET Advice
      const getRes = await request(app)
        .get("/api/v1/consultations/c1/advice")
        .set("Authorization", clientAuth());
      expect(getRes.status).toBe(200);
    });

    it("Consultation document endpoints (/documents) manage attachments", async () => {
      // Upload Document (Client only)
      const uploadRes = await request(app)
        .post("/api/v1/consultations/c1/documents")
        .set("Authorization", clientAuth())
        .send({
          title: "Police Complaint Form",
          fileUrl: "https://cloud.storage.com/file.pdf",
          publicId: "pub_123",
          sizeBytes: 1024 * 50,
        });
      expect(uploadRes.status).toBe(201);

      // Get Documents
      const getRes = await request(app)
        .get("/api/v1/consultations/c1/documents")
        .set("Authorization", lawyerAuth());
      expect(getRes.status).toBe(200);

      // Delete Document
      const deleteRes = await request(app)
        .delete("/api/v1/consultations/c1/documents/doc1")
        .set("Authorization", clientAuth());
      expect(deleteRes.status).toBe(200);
    });
  });

  // ==========================================
  // 11. PAYMENTS MODULE (/api/v1/payments)
  // ==========================================
  describe("11. Payments Module (/api/v1/payments)", () => {
    it("GET /api/v1/payments requires ADMIN", async () => {
      const forbidden = await request(app)
        .get("/api/v1/payments")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get("/api/v1/payments")
        .set("Authorization", adminAuth());
      expect(allowed.status).toBe(200);
    });

    it("POST /api/v1/payments/:id/refund requires ADMIN", async () => {
      const res = await request(app)
        .post("/api/v1/payments/p1/refund")
        .set("Authorization", adminAuth())
        .send({ reason: "Duplicate charge" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/v1/payments/webhook accepts Stripe webhooks", async () => {
      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .send({ type: "payment_intent.succeeded" });
      expect(res.status).toBe(200);
    });

    it("SSLCommerz redirect routes handle callback flows", async () => {
      const successRes = await request(app)
        .post("/api/v1/payments/sslcommerz/success")
        .send({ tran_id: "TXN_123" });
      expect(successRes.status).toBe(302); // redirects to frontend url

      const ipnRes = await request(app)
        .post("/api/v1/payments/sslcommerz/ipn")
        .send({ tran_id: "TXN_123" });
      expect(ipnRes.status).toBe(200);
    });
  });

  // ==========================================
  // 12. REVIEWS MODULE (/api/v1/reviews)
  // ==========================================
  describe("12. Reviews Module (/api/v1/reviews)", () => {
    it("POST /api/v1/reviews allows CLIENT to leave review with rating 1-5", async () => {
      const badRating = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", clientAuth())
        .send({ consultationId: "c1", rating: 6, comment: "Too high rating" });
      expect(badRating.status).toBe(400);

      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", clientAuth())
        .send({ consultationId: "c1", rating: 5, comment: "Exceptional legal advice!" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/v1/reviews requires ADMIN moderation access", async () => {
      const res = await request(app)
        .get("/api/v1/reviews")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
    });

    it("PATCH /api/v1/reviews/:id/visibility toggles review visibility by ADMIN", async () => {
      const res = await request(app)
        .patch("/api/v1/reviews/r1/visibility")
        .set("Authorization", adminAuth())
        .send({ isHidden: false });
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 13. DASHBOARD MODULE (/api/v1/dashboard)
  // ==========================================
  describe("13. Dashboard Module (/api/v1/dashboard)", () => {
    it("GET /api/v1/dashboard/client enforces CLIENT role strictly", async () => {
      const forbidden = await request(app)
        .get("/api/v1/dashboard/client")
        .set("Authorization", lawyerAuth());
      expect(forbidden.status).toBe(403);

      const res = await request(app)
        .get("/api/v1/dashboard/client")
        .set("Authorization", clientAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.totalBookings).toBe(3);
    });

    it("GET /api/v1/dashboard/lawyer enforces LAWYER role strictly", async () => {
      const forbidden = await request(app)
        .get("/api/v1/dashboard/lawyer")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const res = await request(app)
        .get("/api/v1/dashboard/lawyer")
        .set("Authorization", lawyerAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.totalEarnings).toBe(15000);
    });

    it("GET /api/v1/dashboard/admin enforces ADMIN role strictly", async () => {
      const forbidden = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.data.totalUsers).toBe(100);
    });
  });

  // ==========================================
  // 14. AUDIT LOGS MODULE (/api/v1/audit-logs)
  // ==========================================
  describe("14. Audit Logs Module (/api/v1/audit-logs)", () => {
    it("GET /api/v1/audit-logs requires ADMIN / SUPER_ADMIN role", async () => {
      const unauth = await request(app).get("/api/v1/audit-logs");
      expect(unauth.status).toBe(401);

      const forbidden = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", clientAuth());
      expect(forbidden.status).toBe(403);

      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", adminAuth());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
