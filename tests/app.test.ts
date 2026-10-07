import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Express App Integration", () => {
  it("GET / returns 200 with welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("LegalEase");
  });

  it("GET /api/v1/health returns 200 and healthy status", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
  });

  it("returns 404 for non-existent route with standard error envelope", async () => {
    const res = await request(app).get("/api/v1/non-existent");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
