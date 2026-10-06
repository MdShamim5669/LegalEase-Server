import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import { getAdminById, updateAdmin, deleteAdmin } from "./admin.service";
import prisma from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  default: {
    admin: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Admin Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAdminById", () => {
    it("throws 404 if admin not found or soft-deleted", async () => {
      vi.mocked(prisma.admin.findFirst).mockResolvedValue(null);

      await expect(getAdminById("adm_missing")).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "ADMIN_NOT_FOUND",
      });
    });

    it("returns admin record when found", async () => {
      const mockAdmin = { id: "adm_1", name: "Super Admin", isDeleted: false };
      vi.mocked(prisma.admin.findFirst).mockResolvedValue(mockAdmin as any);

      const res = await getAdminById("adm_1");
      expect(res).toEqual(mockAdmin);
    });
  });

  describe("updateAdmin", () => {
    it("throws 404 if admin does not exist", async () => {
      vi.mocked(prisma.admin.findFirst).mockResolvedValue(null);

      await expect(
        updateAdmin("adm_missing", { name: "New Name" })
      ).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "ADMIN_NOT_FOUND",
      });
    });

    it("updates admin profile data", async () => {
      vi.mocked(prisma.admin.findFirst).mockResolvedValue({ id: "adm_1", isDeleted: false } as any);
      const updatedAdmin = { id: "adm_1", name: "Updated Admin Name" };
      vi.mocked(prisma.admin.update).mockResolvedValue(updatedAdmin as any);

      const res = await updateAdmin("adm_1", { name: "Updated Admin Name" });
      expect(res).toEqual(updatedAdmin);
    });
  });

  describe("deleteAdmin", () => {
    it("throws 404 if admin to delete is not found", async () => {
      vi.mocked(prisma.admin.findFirst).mockResolvedValue(null);

      await expect(deleteAdmin("adm_missing")).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "ADMIN_NOT_FOUND",
      });
    });

    it("soft-deletes admin and associated user account in transaction", async () => {
      vi.mocked(prisma.admin.findFirst).mockResolvedValue({
        id: "adm_1",
        userId: "u_adm_1",
        isDeleted: false,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          admin: { update: vi.fn().mockResolvedValue({ id: "adm_1", isDeleted: true }) },
          user: { update: vi.fn().mockResolvedValue({ id: "u_adm_1", isDeleted: true }) },
        };
        return await callback(tx);
      });

      const res = await deleteAdmin("adm_1");
      expect(res).toEqual({ id: "adm_1", isDeleted: true });
    });
  });
});
