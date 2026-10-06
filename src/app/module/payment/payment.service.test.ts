import { describe, it, expect, vi, beforeEach } from "vitest";
import status from "http-status";
import {
  handleWebhook,
  handleSSLCommerzSuccess,
  handleSSLCommerzFail,
  handleSSLCommerzCancel,
  refundPayment,
} from "./payment.service";
import prisma from "../../lib/prisma";
import { stripeGateway } from "../../gateway/StripeGateway";
import { sslCommerzGateway } from "../../gateway/SSLCommerzGateway";
import { sendEmail } from "../../utils/email";
import { Role } from "../../../generated/prisma/enums.js";

vi.mock("../../lib/prisma", () => ({
  default: {
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    consultation: {
      update: vi.fn(),
    },
    lawyerSchedule: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../gateway/StripeGateway", () => ({
  stripeGateway: {
    verifyWebhookSignature: vi.fn(),
    refund: vi.fn(),
  },
}));

vi.mock("../../gateway/SSLCommerzGateway", () => ({
  sslCommerzGateway: {
    verifyWebhookSignature: vi.fn(),
    refund: vi.fn(),
  },
}));

vi.mock("../../utils/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "msg_123" }),
}));

describe("Payment Service Business Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rule 41: Webhook Idempotency & Signature Verification", () => {
    it("returns alreadyProcessed: true and avoids re-execution when stripeEventId already exists", async () => {
      vi.mocked(stripeGateway.verifyWebhookSignature).mockResolvedValueOnce({
        eventId: "evt_duplicate_123",
        eventType: "checkout.session.completed",
        consultationId: "cons_123",
        rawEvent: {},
      });

      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({
        id: "pay_1",
        stripeEventId: "evt_duplicate_123",
        status: "PAID",
      } as any);

      const result = await handleWebhook("raw_body_sample", "mock_signature");

      expect(result).toEqual({ received: true, alreadyProcessed: true });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("processes checkout.session.completed inside transaction and sends email outside tx", async () => {
      vi.mocked(stripeGateway.verifyWebhookSignature).mockResolvedValueOnce({
        eventId: "evt_new_456",
        eventType: "checkout.session.completed",
        consultationId: "cons_new_456",
        rawEvent: {},
      });

      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(null);

      const mockPayment = { id: "p1", amount: 3000, status: "PAID" };
      const mockConsultation = {
        id: "cons_new_456",
        videoCallingId: "room_456",
        client: { name: "Client Karim", email: "karim@test.com" },
        lawyer: { name: "Barrister Rafiq" },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          payment: { update: vi.fn().mockResolvedValue(mockPayment) },
          consultation: { update: vi.fn().mockResolvedValue(mockConsultation) },
        };
        return await callback(txMock);
      });

      const result = await handleWebhook("raw_payload", "valid_signature");

      expect(result).toEqual({ received: true });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "karim@test.com",
          template: "bookingConfirmed",
        })
      );
    });

    it("throws 400 when consultationId is missing in checkout.session.completed event", async () => {
      vi.mocked(stripeGateway.verifyWebhookSignature).mockResolvedValueOnce({
        eventId: "evt_missing_meta",
        eventType: "checkout.session.completed",
        rawEvent: {},
      });

      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(null);

      await expect(handleWebhook("raw_payload", "signature")).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "MISSING_METADATA",
      });
    });
  });

  describe("SSLCommerz Payment Integration & IPN Callbacks", () => {
    it("handles SSLCommerz success callback, updates payment, and returns redirect url", async () => {
      vi.mocked(sslCommerzGateway.verifyWebhookSignature).mockResolvedValueOnce({
        eventId: "ssl_val_888",
        eventType: "checkout.session.completed",
        consultationId: "cons_ssl_888",
        paymentIntentId: "tran_ssl_888",
        rawEvent: {},
      });

      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce(null);

      const mockPayment = { id: "pay_ssl_1", amount: 1500, status: "PAID" };
      const mockConsultation = {
        id: "cons_ssl_888",
        videoCallingId: "room_ssl_888",
        client: { name: "Client Nabila", email: "nabila@test.com" },
        lawyer: { name: "Advocate Kamal" },
      };

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          payment: { update: vi.fn().mockResolvedValue(mockPayment) },
          consultation: { update: vi.fn().mockResolvedValue(mockConsultation) },
        };
        return await callback(txMock);
      });

      const result = await handleSSLCommerzSuccess({
        val_id: "ssl_val_888",
        tran_id: "tran_ssl_888",
        value_a: "cons_ssl_888",
        status: "VALID",
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBe("cons_ssl_888");
      expect(result.redirectUrl).toContain("consultations/cons_ssl_888/success");
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "nabila@test.com",
          template: "bookingConfirmed",
        })
      );
    });

    it("returns failed redirect URL on SSLCommerz failure", async () => {
      const res = await handleSSLCommerzFail({
        value_a: "cons_fail_1",
        error: "Bank transaction timeout",
      });

      expect(res.success).toBe(false);
      expect(res.redirectUrl).toContain("consultations/cons_fail_1/failed");
    });

    it("returns canceled redirect URL on SSLCommerz user cancellation", async () => {
      const res = await handleSSLCommerzCancel({
        value_a: "cons_cancel_1",
      });

      expect(res.success).toBe(false);
      expect(res.redirectUrl).toContain("consultations/cons_cancel_1/canceled");
    });
  });

  describe("Administrative Refund Flow", () => {
    const adminUser = {
      userId: "u_admin_1",
      email: "admin@test.com",
      role: Role.ADMIN,
      status: "ACTIVE" as const,
    };

    it("rejects refund if payment record does not exist", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce(null);

      await expect(refundPayment(adminUser, "pay_nonexistent")).rejects.toMatchObject({
        statusCode: status.NOT_FOUND,
        code: "PAYMENT_NOT_FOUND",
      });
    });

    it("rejects refund if payment status is not PAID (e.g. UNPAID or FAILED)", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: "pay_unpaid",
        status: "UNPAID",
      } as any);

      await expect(refundPayment(adminUser, "pay_unpaid")).rejects.toMatchObject({
        statusCode: status.BAD_REQUEST,
        code: "INVALID_REFUND_STATE",
      });
    });

    it("calls Stripe refund gateway and updates DB records & releases schedule slot", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: "pay_done",
        status: "PAID",
        transactionId: "txn_stripe_123",
        amount: 2500,
        consultationId: "cons_done",
        consultation: { lawyerId: "law_1", scheduleId: "sch_1" },
      } as any);

      vi.mocked(stripeGateway.refund).mockResolvedValueOnce({
        refundId: "re_stripe_999",
        status: "succeeded",
        amountRefunded: 2500,
      });

      const paymentUpdateMock = vi.fn().mockResolvedValue({
        id: "pay_done",
        status: "REFUNDED",
        refundId: "re_stripe_999",
      });
      const consultationUpdateMock = vi.fn().mockResolvedValue({ id: "cons_done", status: "CANCELED" });
      const lawyerScheduleUpdateMock = vi.fn().mockResolvedValue({ count: 1 });

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          payment: { update: paymentUpdateMock },
          consultation: { update: consultationUpdateMock },
          lawyerSchedule: { updateMany: lawyerScheduleUpdateMock },
        };
        return await callback(txMock);
      });

      const res = await refundPayment(adminUser, "pay_done", "Customer dispute resolved");

      expect(stripeGateway.refund).toHaveBeenCalledWith({
        transactionId: "txn_stripe_123",
        amount: 2500,
        reason: "Customer dispute resolved",
      });

      expect(paymentUpdateMock).toHaveBeenCalledWith({
        where: { id: "pay_done" },
        data: expect.objectContaining({
          status: "REFUNDED",
          refundId: "re_stripe_999",
        }),
      });

      expect(consultationUpdateMock).toHaveBeenCalledWith({
        where: { id: "cons_done" },
        data: expect.objectContaining({
          status: "CANCELED",
          paymentStatus: "REFUNDED",
        }),
      });

      expect(lawyerScheduleUpdateMock).toHaveBeenCalledWith({
        where: { lawyerId: "law_1", scheduleId: "sch_1" },
        data: { isBooked: false },
      });

      expect(res.status).toBe("REFUNDED");
    });

    it("routes refund to SSLCommerz gateway when payment provider is SSLCOMMERZ", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValueOnce({
        id: "pay_ssl_done",
        status: "PAID",
        transactionId: "tran_ssl_123",
        amount: 1800,
        consultationId: "cons_ssl_done",
        paymentGatewayData: { provider: "SSLCOMMERZ" },
        consultation: { lawyerId: "law_1", scheduleId: "sch_1" },
      } as any);

      vi.mocked(sslCommerzGateway.refund).mockResolvedValueOnce({
        refundId: "re_ssl_999",
        status: "succeeded",
        amountRefunded: 1800,
      });

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const txMock = {
          payment: { update: vi.fn().mockResolvedValue({ id: "pay_ssl_done", status: "REFUNDED" }) },
          consultation: { update: vi.fn().mockResolvedValue({ id: "cons_ssl_done", status: "CANCELED" }) },
          lawyerSchedule: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return await callback(txMock);
      });

      const res = await refundPayment(adminUser, "pay_ssl_done");

      expect(sslCommerzGateway.refund).toHaveBeenCalledWith({
        transactionId: "tran_ssl_123",
        amount: 1800,
        reason: "requested_by_customer",
      });
      expect(res.status).toBe("REFUNDED");
    });
  });
});
