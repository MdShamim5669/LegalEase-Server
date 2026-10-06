import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import {
  getLawyerById,
  updateLawyer,
  verifyLawyer,
  deleteLawyer,
  getTopLawyers,
} from "./lawyer.service";
import prisma from "../../lib/prisma";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";

vi.mock("../../lib/prisma", () => ({
  default: {
    lawyer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Lawyer Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLawyerById", () => {
    it("throws 404 if lawyer not found or deleted", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue(null);

      await expect(getLawyerById("missing_id", false)).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "LAWYER_NOT_FOUND",
      });
    });

    it("returns lawyer if verified for public clients", async () => {
      const mockLawyer = { id: "l_1", name: "Advocate Rahman", isVerified: true, isDeleted: false };
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue(mockLawyer as any);

      const result = await getLawyerById("l_1", false);
      expect(result).toEqual(mockLawyer);
      expect(prisma.lawyer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "l_1", isDeleted: false, isVerified: true },
        })
      );
    });

    it("allows admin to view unverified lawyer profiles", async () => {
      const mockLawyer = { id: "l_unverified", name: "Unverified Advocate", isVerified: false, isDeleted: false };
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue(mockLawyer as any);

      const result = await getLawyerById("l_unverified", true);
      expect(result).toEqual(mockLawyer);
      expect(prisma.lawyer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "l_unverified", isDeleted: false },
        })
      );
    });
  });

  describe("updateLawyer", () => {
    it("throws 403 if a lawyer attempts to edit another lawyer profile", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue({
        id: "l_target",
        userId: "u_owner",
        isDeleted: false,
      } as any);

      const maliciousActor = {
        userId: "u_other",
        email: "other@test.com",
        role: Role.LAWYER,
        status: UserStatus.ACTIVE,
      };

      await expect(
        updateLawyer(maliciousActor, "l_target", { bio: "hacked" })
      ).rejects.toMatchObject({
        statusCode: status.FORBIDDEN,
        code: "FORBIDDEN",
      });
    });

    it("allows lawyer to update their own profile", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue({
        id: "l_target",
        userId: "u_owner",
        isDeleted: false,
      } as any);

      const updatedRecord = { id: "l_target", bio: "Updated Bio" };
      vi.mocked(prisma.lawyer.update).mockResolvedValue(updatedRecord as any);

      const ownerActor = {
        userId: "u_owner",
        email: "owner@test.com",
        role: Role.LAWYER,
        status: UserStatus.ACTIVE,
      };

      const result = await updateLawyer(ownerActor, "l_target", { bio: "Updated Bio" });
      expect(result).toEqual(updatedRecord);
    });
  });

  describe("verifyLawyer & audit log creation", () => {
    it("updates verification status and registers audit log entry in transaction", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue({
        id: "l_1",
        isDeleted: false,
      } as any);

      const mockAdmin = {
        userId: "admin_1",
        email: "admin@legalease.com",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          lawyer: { update: vi.fn().mockResolvedValue({ id: "l_1", isVerified: true }) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const result = await verifyLawyer(mockAdmin, "l_1", {
        isVerified: true,
        verificationNote: "Bar Council certificate verified",
      });

      expect(result).toEqual({ id: "l_1", isVerified: true });
    });
  });

  describe("deleteLawyer", () => {
    it("soft-deletes both lawyer and user entities in a transaction", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue({
        id: "l_1",
        userId: "u_1",
        isDeleted: false,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          lawyer: { update: vi.fn().mockResolvedValue({ id: "l_1", isDeleted: true }) },
          user: { update: vi.fn().mockResolvedValue({ id: "u_1", isDeleted: true }) },
        };
        return await callback(tx);
      });

      const res = await deleteLawyer("l_1");
      expect(res).toEqual({ id: "l_1", isDeleted: true });
    });
  });

  describe("getTopLawyers", () => {
    it("fetches verified lawyers ordered by rating and review count", async () => {
      const mockLawyers = [{ id: "l_top1" }, { id: "l_top2" }];
      vi.mocked(prisma.lawyer.findMany).mockResolvedValue(mockLawyers as any);

      const res = await getTopLawyers();
      expect(res).toEqual(mockLawyers);
      expect(prisma.lawyer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 6,
          where: { isDeleted: false, isVerified: true },
        })
      );
    });
  });
});
