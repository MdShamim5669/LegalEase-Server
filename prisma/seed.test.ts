import { describe, it, expect, vi } from "vitest";
import { seedSuperAdmin, seedPracticeAreas, DEFAULT_PRACTICE_AREAS } from "./seed";
import env from "../src/app/config/env";
import { Role, UserStatus } from "../src/generated/prisma/enums.js";

describe("Database Seeder (prisma/seed.ts)", () => {
  it("skips creating SUPER_ADMIN if account already exists", async () => {
    const mockClient: any = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: "existing_admin_id",
          email: env.SUPER_ADMIN_EMAIL,
          role: Role.SUPER_ADMIN,
        }),
      },
    };

    const result = await seedSuperAdmin(mockClient);
    expect(result.created).toBe(false);
    expect(mockClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: env.SUPER_ADMIN_EMAIL },
    });
  });

  it("creates user, admin, and account in transaction if SUPER_ADMIN does not exist", async () => {
    const mockUser = {
      id: "new_super_id",
      email: env.SUPER_ADMIN_EMAIL,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    };
    const mockAdmin = { id: "admin_rec_id", userId: "new_super_id" };
    const mockAccount = { id: "acc_rec_id", userId: "new_super_id" };

    const mockTx = {
      user: { create: vi.fn().mockResolvedValue(mockUser) },
      admin: { create: vi.fn().mockResolvedValue(mockAdmin) },
      account: { create: vi.fn().mockResolvedValue(mockAccount) },
    };

    const mockClient: any = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return await callback(mockTx);
      }),
    };

    const result = await seedSuperAdmin(mockClient);
    expect(result.created).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(result.admin).toEqual(mockAdmin);
    expect(result.account).toEqual(mockAccount);
    expect(mockTx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: env.SUPER_ADMIN_EMAIL,
        role: Role.SUPER_ADMIN,
      }),
    });
  });

  it("upserts all default practice areas", async () => {
    const mockClient: any = {
      practiceArea: {
        upsert: vi.fn().mockImplementation(async ({ create }) => ({
          id: "pa_id",
          ...create,
        })),
      },
    };

    const areas = await seedPracticeAreas(mockClient);
    expect(areas).toHaveLength(DEFAULT_PRACTICE_AREAS.length);
    expect(mockClient.practiceArea.upsert).toHaveBeenCalledTimes(DEFAULT_PRACTICE_AREAS.length);
  });
});
