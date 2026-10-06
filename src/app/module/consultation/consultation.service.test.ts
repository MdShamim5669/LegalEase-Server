import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import {
  bookConsultation,
  updateConsultationStatus,
  getConsultationById,
  updateAdvice,
  uploadDocument,
  ALLOWED_STATUS_TRANSITIONS,
} from "./consultation.service";
import prisma from "../../lib/prisma";
import { stripeGateway } from "../../gateway/StripeGateway";
import { Role, ConsultationStatus } from "../../../generated/prisma/enums.js";
import { AppError } from "../../errorHelpers/AppError";

vi.mock("../../lib/prisma", () => ({
  default: {
    client: { findFirst: vi.fn() },
    consultation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    legalAdvice: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    caseDocument: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../gateway/StripeGateway", () => ({
  stripeGateway: {
    createCheckoutSession: vi.fn(),
  },
}));

describe("Consultation Service Business Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rule 2 & 9: Atomic Booking & Race Condition Guard", () => {
    const mockClientUser = {
      userId: "u_client_1",
      email: "client@test.com",
      role: Role.CLIENT,
      status: "ACTIVE" as const,
    };

    it("throws 409 CONFLICT if the slot was booked concurrently (count === 0)", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "c_1",
        userId: "u_client_1",
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txMock = {
          lawyer: { findFirst: vi.fn().mockResolvedValue({ id: "law_1", consultationFee: 1500 }) },
          lawyerSchedule: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }), // Slot already booked!
          },
        };
        return await callback(txMock);
      });

      await expect(
        bookConsultation(mockClientUser, {
          lawyerId: "law_1",
          scheduleId: "sch_1",
        })
      ).rejects.toMatchObject({
        statusCode: status.CONFLICT,
        code: "SLOT_ALREADY_BOOKED",
      });
    });

    it("locks slot atomically, creates consultation + payment, and calls Stripe outside tx", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValueOnce({
        id: "c_1",
        userId: "u_client_1",
      } as any);

      const mockConsultation = { id: "cons_123", videoCallingId: "room_1" };
      const mockPayment = { id: "pay_123", amount: 2000 };
      const mockLawyer = { id: "law_1", name: "Advocate Rahim", consultationFee: 2000 };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          lawyer: { findFirst: vi.fn().mockResolvedValue(mockLawyer) },
          lawyerSchedule: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }), // Slot locked successfully
          },
          consultation: { create: vi.fn().mockResolvedValue(mockConsultation) },
          payment: { create: vi.fn().mockResolvedValue(mockPayment) },
        };
        return await callback(txMock);
      });

      vi.mocked(stripeGateway.createCheckoutSession).mockResolvedValueOnce({
        sessionId: "sess_stripe_123",
        url: "https://checkout.stripe.com/pay/sess_stripe_123",
        currency: "bdt",
        amount: 2000,
      });

      const result = await bookConsultation(mockClientUser, {
        lawyerId: "law_1",
        scheduleId: "sch_1",
      });

      expect(result.consultation).toEqual(mockConsultation);
      expect(result.sessionId).toBe("sess_stripe_123");
      expect(stripeGateway.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          consultationId: "cons_123",
          paymentId: "pay_123",
          amount: 2000,
        })
      );
    });
  });

  describe("Rule 27: Consultation Status State Machine Transitions", () => {
    it("allowed transitions adhere strictly to the transition map", () => {
      expect(ALLOWED_STATUS_TRANSITIONS[ConsultationStatus.SCHEDULED]).toEqual([
        ConsultationStatus.INPROGRESS,
        ConsultationStatus.CANCELED,
      ]);
      expect(ALLOWED_STATUS_TRANSITIONS[ConsultationStatus.INPROGRESS]).toEqual([
        ConsultationStatus.COMPLETED,
      ]);
      expect(ALLOWED_STATUS_TRANSITIONS[ConsultationStatus.COMPLETED]).toEqual([]);
      expect(ALLOWED_STATUS_TRANSITIONS[ConsultationStatus.CANCELED]).toEqual([]);
    });

    it("rejects invalid status transitions (e.g. COMPLETED -> CANCELED) with 400", async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
        id: "c_done",
        status: ConsultationStatus.COMPLETED,
      } as any);

      const user = { userId: "u1", email: "a@a.com", role: Role.ADMIN, status: "ACTIVE" as const };

      await expect(
        updateConsultationStatus(user, "c_done", ConsultationStatus.CANCELED)
      ).rejects.toThrowError(AppError);
    });

    it("cancels consultation and releases lawyer schedule slot (isBooked = false)", async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
        id: "c_cancel",
        status: ConsultationStatus.SCHEDULED,
        lawyerId: "law_1",
        scheduleId: "sch_1",
      } as any);

      const lawyerScheduleUpdateMock = vi.fn().mockResolvedValue({ count: 1 });
      const consultationUpdateMock = vi.fn().mockResolvedValue({
        id: "c_cancel",
        status: ConsultationStatus.CANCELED,
      });

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          consultation: { update: consultationUpdateMock },
          lawyerSchedule: { updateMany: lawyerScheduleUpdateMock },
        };
        return await callback(txMock);
      });

      const user = { userId: "u1", email: "a@a.com", role: Role.ADMIN, status: "ACTIVE" as const };
      const res = await updateConsultationStatus(user, "c_cancel", ConsultationStatus.CANCELED, "Client request");

      expect(res.status).toBe(ConsultationStatus.CANCELED);
      expect(lawyerScheduleUpdateMock).toHaveBeenCalledWith({
        where: { lawyerId: "law_1", scheduleId: "sch_1" },
        data: { isBooked: false },
      });
    });
  });

  describe("Rule 1 & 8: Confidentiality & Privilege Protection", () => {
    it("blocks unauthorized third party from accessing consultation details with 403", async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
        id: "c_secret",
        client: { userId: "u_client_original" },
        lawyer: { userId: "u_lawyer_assigned" },
      } as any);

      const thirdPartyUser = {
        userId: "u_unrelated_stranger",
        email: "stranger@test.com",
        role: Role.CLIENT,
        status: "ACTIVE" as const,
      };

      await expect(getConsultationById(thirdPartyUser, "c_secret")).rejects.toThrowError(AppError);
    });

    it("prevents editing advice notes once the 24-hour window has expired", async () => {
      const expiredCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      vi.mocked(prisma.legalAdvice.findUnique).mockResolvedValueOnce({
        id: "adv_1",
        consultationId: "cons_1",
        createdAt: expiredCreatedAt,
        consultation: { lawyer: { userId: "u_lawyer_1" } },
      } as any);

      const lawyerUser = {
        userId: "u_lawyer_1",
        email: "lawyer@test.com",
        role: Role.LAWYER,
        status: "ACTIVE" as const,
      };

      await expect(
        updateAdvice(lawyerUser, "cons_1", { summary: "Updated legal advice" })
      ).rejects.toThrowError(AppError);
    });

    it("prevents non-client from uploading case documents to consultation", async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValueOnce({
        id: "cons_1",
        client: { id: "c_real", userId: "u_client_real" },
      } as any);

      const imposterUser = {
        userId: "u_someone_else",
        email: "other@test.com",
        role: Role.CLIENT,
        status: "ACTIVE" as const,
      };

      await expect(
        uploadDocument(imposterUser, "cons_1", {
          title: "Contract.pdf",
          fileUrl: "https://cloud.com/doc.pdf",
          publicId: "pid_1",
          sizeBytes: 1024,
        })
      ).rejects.toThrowError(AppError);
    });
  });
});
