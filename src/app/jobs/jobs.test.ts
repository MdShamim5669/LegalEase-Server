import { describe, it, expect, vi } from "vitest";
import { cancelUnpaidConsultations } from "./cancelUnpaid.job";
import prisma from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  default: {
    consultation: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Scheduled Jobs", () => {
  it("cancelUnpaidConsultations returns 0 when no expired consultations exist", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValueOnce([]);

    const count = await cancelUnpaidConsultations(30);
    expect(count).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cancelUnpaidConsultations cancels each expired consultation inside a transaction", async () => {
    const mockExpired = [
      { id: "c1", lawyerId: "l1", scheduleId: "s1" },
      { id: "c2", lawyerId: "l2", scheduleId: "s2" },
    ];
    vi.mocked(prisma.consultation.findMany).mockResolvedValueOnce(mockExpired as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const txMock = {
        consultation: { update: vi.fn() },
        lawyerSchedule: { updateMany: vi.fn() },
        payment: { deleteMany: vi.fn() },
      };
      return await callback(txMock);
    });

    const count = await cancelUnpaidConsultations(30);
    expect(count).toBe(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
