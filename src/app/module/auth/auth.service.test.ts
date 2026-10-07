import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import {
  registerClient,
  login,
  verifyEmail,
  refreshToken,
  changePassword,
  getMe,
} from "./auth.service";
import prisma from "../../lib/prisma";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import * as jwtUtil from "../../utils/jwt";
import * as emailUtil from "../../utils/email";

vi.mock("../../lib/prisma", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    client: {
      create: vi.fn(),
    },
    account: {
      create: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    verification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/jwt", () => ({
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("../../utils/email", () => ({
  sendEmail: vi.fn(),
}));

describe("Auth Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerClient", () => {
    it("throws 409 CONFLICT if user email already exists", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u_1",
        email: "test@example.com",
      } as any);

      await expect(
        registerClient({
          name: "John Client",
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toMatchObject({
        statusCode: status.CONFLICT,
        code: "EMAIL_EXISTS",
      });
    });

    it("registers client atomically and triggers verification email", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const mockUser = { id: "u_1", email: "new@example.com", name: "New Client", role: Role.CLIENT };
      const mockClient = { id: "c_1", userId: "u_1", name: "New Client" };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          user: { create: vi.fn().mockResolvedValue(mockUser) },
          client: { create: vi.fn().mockResolvedValue(mockClient) },
          account: { create: vi.fn().mockResolvedValue({}) },
          verification: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const result = await registerClient({
        name: "New Client",
        email: "new@example.com",
        password: "securePassword123",
      });

      expect(result.user).toEqual(mockUser);
      expect(result.client).toEqual(mockClient);
      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "new@example.com",
          template: "otp",
        })
      );
    });
  });

  describe("login", () => {
    it("throws 401 UNAUTHORIZED if user does not exist", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(
        login({ email: "missing@example.com", password: "pwd" })
      ).rejects.toMatchObject({
        statusCode: status.UNAUTHORIZED,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("throws 403 FORBIDDEN if user is suspended/blocked", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u_blocked",
        email: "blocked@example.com",
        status: UserStatus.BLOCKED,
        isDeleted: false,
      } as any);

      await expect(
        login({ email: "blocked@example.com", password: "pwd" })
      ).rejects.toMatchObject({
        statusCode: status.FORBIDDEN,
        code: "USER_BLOCKED",
      });
    });

    it("throws 401 UNAUTHORIZED if password does not match", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u_valid",
        email: "valid@example.com",
        status: UserStatus.ACTIVE,
        isDeleted: false,
      } as any);
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ password: "correct_password" } as any);

      await expect(
        login({ email: "valid@example.com", password: "wrong_password" })
      ).rejects.toMatchObject({
        statusCode: status.UNAUTHORIZED,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("returns user payload and tokens on successful authentication", async () => {
      const mockUser = {
        id: "u_valid",
        name: "Valid User",
        email: "valid@example.com",
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
        needPasswordChange: false,
        emailVerified: true,
        isDeleted: false,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ password: "pwd" } as any);
      vi.mocked(jwtUtil.generateToken)
        .mockReturnValueOnce("mock_access_token")
        .mockReturnValueOnce("mock_refresh_token");

      const res = await login({ email: "valid@example.com", password: "pwd" });

      expect(res.user.id).toBe("u_valid");
      expect(res.accessToken).toBe("mock_access_token");
      expect(res.refreshToken).toBe("mock_refresh_token");
    });
  });

  describe("verifyEmail", () => {
    it("throws 400 BAD_REQUEST if OTP is invalid or expired", async () => {
      vi.mocked(prisma.verification.findFirst).mockResolvedValue(null);

      await expect(
        verifyEmail({ email: "test@example.com", otp: "000000" })
      ).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "INVALID_OTP",
      });
    });

    it("activates user email verification on valid OTP", async () => {
      vi.mocked(prisma.verification.findFirst).mockResolvedValue({
        id: "v_1",
        identifier: "test@example.com",
        value: "123456",
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          verification: { delete: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const res = await verifyEmail({ email: "test@example.com", otp: "123456" });
      expect(res.verified).toBe(true);
    });
  });

  describe("refreshToken", () => {
    it("throws 401 if refresh token verification fails", async () => {
      vi.mocked(jwtUtil.verifyToken).mockImplementation(() => {
        throw new Error("Expired");
      });

      await expect(refreshToken("bad_token")).rejects.toMatchObject({
        statusCode: status.UNAUTHORIZED,
        code: "TOKEN_EXPIRED",
      });
    });

    it("throws 401 if user is deleted or not active", async () => {
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({ userId: "u_1" } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(refreshToken("valid_token")).rejects.toMatchObject({
        statusCode: status.UNAUTHORIZED,
        code: "USER_INACTIVE",
      });
    });

    it("issues a new access token on valid refresh token", async () => {
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({ userId: "u_1" } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u_1",
        email: "user@test.com",
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
      } as any);
      vi.mocked(jwtUtil.generateToken).mockReturnValue("new_access_token");

      const res = await refreshToken("valid_token");
      expect(res.accessToken).toBe("new_access_token");
    });
  });

  describe("changePassword", () => {
    it("upserts account password and clears needPasswordChange flag", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          account: { upsert: vi.fn().mockResolvedValue({}) },
          user: { update: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const res = await changePassword("u_1", { newPassword: "newPass123!" });
      expect(res.success).toBe(true);
    });
  });

  describe("getMe", () => {
    it("throws 404 NOT_FOUND if user profile is missing", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        getMe({ userId: "missing_u", email: "a@b.com", role: Role.CLIENT, status: UserStatus.ACTIVE })
      ).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "USER_NOT_FOUND",
      });
    });

    it("returns user profile with relations", async () => {
      const mockProfile = {
        id: "u_1",
        name: "Test User",
        email: "test@example.com",
        client: { id: "c_1" },
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockProfile as any);

      const res = await getMe({ userId: "u_1", email: "test@example.com", role: Role.CLIENT, status: UserStatus.ACTIVE });
      expect(res).toEqual(mockProfile);
    });
  });
});
