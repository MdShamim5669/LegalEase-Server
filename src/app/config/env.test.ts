import { describe, it, expect } from "vitest";
import { validateEnv } from "./env";

describe("validateEnv", () => {
  it("validates and defaults correctly when required variables are present", () => {
    const raw = {
      DATABASE_URL: "postgresql://postgres:pass@localhost:5432/legalease",
      BETTER_AUTH_SECRET: "12345678901234567890123456789012",
      ACCESS_TOKEN_SECRET: "access_secret",
      REFRESH_TOKEN_SECRET: "refresh_secret",
    };
    const config = validateEnv(raw);
    expect(config.PORT).toBe(5000);
    expect(config.NODE_ENV).toBe("development");
    expect(config.FRONTEND_URL).toBe("http://localhost:3000");
  });

  it("throws validation error when required variables are missing", () => {
    expect(() => validateEnv({})).toThrow();
  });
});
