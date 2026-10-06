import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getClientDashboard,
  getLawyerDashboard,
  getAdminDashboard,
} from "./dashboard.service";
import prisma from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  default: {
    client: { findFirst: vi.fn() },
    lawyer: { findFirst: vi.fn(), count: vi.fn() },
    user: { count: vi.fn() },
    consultation: { findMany: vi.fn(), count: vi.fn() },
    payment: { aggregate: vi.fn() },
  },
}));

describe("Dashboard Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClientDashboard", () => {
    it("returns empty structure when client profile is not found", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

      const res = await getClientDashboard("u_missing");
      expect(res).toEqual({
        upcomingConsultations: [],
        pastConsultations: [],
        totalBooked: 0,
      });
    });

    it("aggregates client consultations when client exists", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "c_1" } as any);
      vi.mocked(prisma.consultation.findMany)
        .mockResolvedValueOnce([{ id: "cons_upcoming" }] as any)
        .mockResolvedValueOnce([{ id: "cons_past" }] as any);
      vi.mocked(prisma.consultation.count).mockResolvedValue(2);

      const res = await getClientDashboard("u_client");
      expect(res.totalBooked).toBe(2);
      expect(res.upcomingConsultations).toHaveLength(1);
      expect(res.pastConsultations).toHaveLength(1);
    });
  });

  describe("getLawyerDashboard", () => {
    it("returns empty metrics when lawyer profile is missing", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue(null);

      const res = await getLawyerDashboard("u_missing");
      expect(res).toEqual({
        todayConsultations: [],
        upcomingConsultations: [],
        totalEarned: 0,
      });
    });

    it("aggregates lawyer earnings and consultation counts", async () => {
      vi.mocked(prisma.lawyer.findFirst).mockResolvedValue({
        id: "l_1",
        name: "Advocate Khan",
        averageRating: 4.9,
        reviewCount: 30,
      } as any);

      vi.mocked(prisma.consultation.findMany).mockResolvedValue([{ id: "cons_1" }] as any);
      vi.mocked(prisma.consultation.count).mockResolvedValue(25);
      vi.mocked(prisma.payment.aggregate).mockResolvedValue({
        _sum: { amount: 50000 },
      } as any);

      const res = await getLawyerDashboard("u_lawyer");
      expect(res.totalCompleted).toBe(25);
      expect(res.totalEarned).toBe(50000);
      expect(res.lawyerProfile?.name).toBe("Advocate Khan");
    });
  });

  describe("getAdminDashboard", () => {
    it("aggregates platform-wide statistics", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(150);
      vi.mocked(prisma.lawyer.count).mockResolvedValue(20);
      vi.mocked(prisma.consultation.count).mockResolvedValue(80);
      vi.mocked(prisma.payment.aggregate).mockResolvedValue({
        _sum: { amount: 240000 },
      } as any);

      const res = await getAdminDashboard();
      expect(res).toEqual({
        totalUsers: 150,
        totalVerifiedLawyers: 20,
        totalConsultations: 80,
        totalPlatformRevenue: 240000,
      });
    });
  });
});
