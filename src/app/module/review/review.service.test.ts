import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import { createReview, updateVisibility } from "./review.service";
import prisma from "../../lib/prisma";
import { Role, UserStatus, ConsultationStatus } from "../../../generated/prisma/enums.js";

vi.mock("../../lib/prisma", () => ({
  default: {
    client: { findFirst: vi.fn() },
    consultation: { findUnique: vi.fn() },
    review: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    lawyer: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("Review Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockClientUser = {
    userId: "u_client_1",
    email: "client@test.com",
    role: Role.CLIENT,
    status: UserStatus.ACTIVE,
  };

  const mockAdminUser = {
    userId: "u_admin_1",
    email: "admin@test.com",
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  describe("createReview", () => {
    it("throws 404 if client profile not found", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

      await expect(
        createReview(mockClientUser, { consultationId: "c_1", rating: 5 })
      ).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "CLIENT_NOT_FOUND",
      });
    });

    it("throws 403 if user is not the booked client", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client_1", userId: "u_client_1" } as any);
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
        id: "c_1",
        clientId: "client_different",
        status: ConsultationStatus.COMPLETED,
      } as any);

      await expect(
        createReview(mockClientUser, { consultationId: "c_1", rating: 5 })
      ).rejects.toMatchObject({
        statusCode: status.FORBIDDEN,
        code: "FORBIDDEN",
      });
    });

    it("throws 400 if consultation is not yet COMPLETED", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client_1", userId: "u_client_1" } as any);
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
        id: "c_1",
        clientId: "client_1",
        status: ConsultationStatus.SCHEDULED,
      } as any);

      await expect(
        createReview(mockClientUser, { consultationId: "c_1", rating: 5 })
      ).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "CONSULTATION_NOT_COMPLETED",
      });
    });

    it("throws 409 if a review has already been submitted", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client_1", userId: "u_client_1" } as any);
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
        id: "c_1",
        clientId: "client_1",
        status: ConsultationStatus.COMPLETED,
        review: { id: "r_existing" },
      } as any);

      await expect(
        createReview(mockClientUser, { consultationId: "c_1", rating: 5 })
      ).rejects.toMatchObject({
        statusCode: status.CONFLICT,
        code: "ALREADY_REVIEWED",
      });
    });

    it("throws 400 if rating is invalid (e.g. 0 or 6)", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client_1", userId: "u_client_1" } as any);
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
        id: "c_1",
        clientId: "client_1",
        status: ConsultationStatus.COMPLETED,
        review: null,
      } as any);

      await expect(
        createReview(mockClientUser, { consultationId: "c_1", rating: 6 })
      ).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "INVALID_RATING",
      });
    });

    it("creates review and recalculates lawyer aggregate ratings atomically", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client_1", userId: "u_client_1" } as any);
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
        id: "c_1",
        clientId: "client_1",
        lawyerId: "l_1",
        status: ConsultationStatus.COMPLETED,
        review: null,
      } as any);

      const mockCreatedReview = { id: "rev_1", rating: 5, comment: "Excellent advice" };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          review: {
            create: vi.fn().mockResolvedValue(mockCreatedReview),
            aggregate: vi.fn().mockResolvedValue({
              _avg: { rating: 4.8 },
              _count: { rating: 12 },
            }),
          },
          lawyer: { update: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const result = await createReview(mockClientUser, {
        consultationId: "c_1",
        rating: 5,
        comment: "Excellent advice",
      });

      expect(result).toEqual(mockCreatedReview);
    });
  });

  describe("updateVisibility", () => {
    it("throws 404 if review does not exist", async () => {
      vi.mocked(prisma.review.findUnique).mockResolvedValue(null);

      await expect(
        updateVisibility(mockAdminUser, "rev_missing", true)
      ).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "REVIEW_NOT_FOUND",
      });
    });

    it("moderates review visibility and updates lawyer rating aggregate in transaction", async () => {
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: "rev_1",
        lawyerId: "l_1",
        isHidden: false,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          review: {
            update: vi.fn().mockResolvedValue({ id: "rev_1", isHidden: true }),
            aggregate: vi.fn().mockResolvedValue({
              _avg: { rating: 4.5 },
              _count: { rating: 10 },
            }),
          },
          lawyer: { update: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const res = await updateVisibility(mockAdminUser, "rev_1", true);
      expect(res).toEqual({ id: "rev_1", isHidden: true });
    });
  });
});
