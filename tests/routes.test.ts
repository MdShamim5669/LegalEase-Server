import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { generateToken } from "../src/app/utils/jwt";
import env from "../src/app/config/env";
import { Role } from "../src/generated/prisma/enums.js";

describe("API Route Integration & Auth Guarding", () => {
  it("GET /api/v1/health returns 200 and healthy status", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
  });

  describe("Public Routes", () => {
    it("GET /api/v1/lawyers returns 200 without authentication", async () => {
      const res = await request(app).get("/api/v1/lawyers");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/v1/practice-areas returns 200 without authentication", async () => {
      const res = await request(app).get("/api/v1/practice-areas");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Protected Routes & checkAuth Guard", () => {
    it("rejects unauthenticated request to /api/v1/dashboard/admin with 401", async () => {
      const res = await request(app).get("/api/v1/dashboard/admin");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("rejects unauthorized client requesting /api/v1/dashboard/admin with 403 FORBIDDEN", async () => {
      const clientToken = generateToken(
        { userId: "client_1", email: "client@test.com", role: Role.CLIENT, status: "ACTIVE" },
        env.ACCESS_TOKEN_SECRET,
        "1h"
      );

      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("allows authorized admin requesting /api/v1/dashboard/admin with 200 OK", async () => {
      const adminToken = generateToken(
        { userId: "admin_1", email: "admin@test.com", role: Role.ADMIN, status: "ACTIVE" },
        env.ACCESS_TOKEN_SECRET,
        "1h"
      );

      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Administrative stats");
    });

    it("allows authorized lawyer requesting /api/v1/lawyer-schedules/my with 200 OK", async () => {
      const lawyerToken = generateToken(
        { userId: "lawyer_1", email: "lawyer@test.com", role: Role.LAWYER, status: "ACTIVE" },
        env.ACCESS_TOKEN_SECRET,
        "1h"
      );

      const res = await request(app)
        .get("/api/v1/lawyer-schedules/my")
        .set("Authorization", `Bearer ${lawyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows authorized client requesting /api/v1/clients/me with 200 OK", async () => {
      const clientToken = generateToken(
        { userId: "client_1", email: "client@test.com", role: Role.CLIENT, status: "ACTIVE" },
        env.ACCESS_TOKEN_SECRET,
        "1h"
      );

      const res = await request(app)
        .get("/api/v1/clients/me")
        .set("Authorization", `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(Role.CLIENT);
    });
  });

  describe("Undefined Routes", () => {
    it("returns 404 NOT_FOUND envelope on unknown endpoints", async () => {
      const res = await request(app).get("/api/v1/non-existent-route");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });
});
