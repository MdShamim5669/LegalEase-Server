import { describe, it, expect, vi, beforeEach } from "vitest";
import { StripeGateway } from "./StripeGateway";
import { SSLCommerzGateway } from "./SSLCommerzGateway";
import { getPaymentGateway } from "./gateway.factory";
import { AppError } from "../errorHelpers/AppError";

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockImplementation((params) =>
          Promise.resolve({
            id: "cs_test_12345",
            url: "https://checkout.stripe.com/pay/cs_test_12345",
            currency: "bdt",
            metadata: params.metadata,
            payment_intent: "pi_test_created_123",
          })
        ),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation((_payload, signature) => {
        if (signature === "invalid_sig") {
          throw new Error("Invalid signature");
        }
        if (signature === "expired_sig") {
          return {
            id: "evt_expired_123",
            type: "checkout.session.expired",
            data: {
              object: {
                metadata: { consultationId: "con_exp_123", paymentId: "pay_exp_123" },
                currency: "bdt",
              },
            },
          };
        }
        if (signature === "failed_sig") {
          return {
            id: "evt_failed_123",
            type: "payment_intent.payment_failed",
            data: {
              object: {
                id: "pi_failed_123",
                metadata: { consultationId: "con_fail_123", paymentId: "pay_fail_123" },
                currency: "bdt",
              },
            },
          };
        }
        return {
          id: "evt_test_12345",
          type: "checkout.session.completed",
          data: {
            object: {
              metadata: { consultationId: "con_987", paymentId: "pay_987" },
              amount_total: 100000, // 1000 BDT in poisha
              currency: "bdt",
              payment_intent: "pi_test_intent_987",
            },
          },
        };
      }),
    },
    refunds: {
      create: vi.fn().mockImplementation((params) => {
        if (params.payment_intent === "pi_error") {
          throw new Error("Charge already refunded");
        }
        return Promise.resolve({
          id: "re_test_12345",
          status: "succeeded",
          amount: params.amount,
        });
      }),
    },
  }));
  return { default: StripeMock };
});

describe("Payment Gateway - Stripe Implementation", () => {
  let gateway: StripeGateway;

  beforeEach(() => {
    gateway = new StripeGateway("sk_test_mock");
  });

  it("creates checkout session with correct BDT amount and consultation metadata", async () => {
    const result = await gateway.createCheckoutSession({
      consultationId: "con_123",
      paymentId: "pay_123",
      amount: 1000, // 1000 BDT
      clientEmail: "client@example.com",
      lawyerName: "Adv. Rahman",
    });

    expect(result.sessionId).toBe("cs_test_12345");
    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_12345");
    expect(result.amount).toBe(1000);
    expect(result.currency).toBe("bdt");
    expect(result.paymentIntentId).toBe("pi_test_created_123");
  });

  it("verifies webhook signature and extracts consultationId, paymentId and integer taka", async () => {
    const event = await gateway.verifyWebhookSignature("raw_payload", "valid_sig");

    expect(event.eventId).toBe("evt_test_12345");
    expect(event.eventType).toBe("checkout.session.completed");
    expect(event.consultationId).toBe("con_987");
    expect(event.paymentId).toBe("pay_987");
    expect(event.amountTotal).toBe(1000); // 100000 poisha -> 1000 taka
    expect(event.paymentIntentId).toBe("pi_test_intent_987");
  });

  it("handles checkout.session.expired event properly", async () => {
    const event = await gateway.verifyWebhookSignature("raw_payload", "expired_sig");

    expect(event.eventId).toBe("evt_expired_123");
    expect(event.eventType).toBe("checkout.session.expired");
    expect(event.consultationId).toBe("con_exp_123");
    expect(event.paymentId).toBe("pay_exp_123");
  });

  it("handles payment_intent.payment_failed event properly", async () => {
    const event = await gateway.verifyWebhookSignature("raw_payload", "failed_sig");

    expect(event.eventId).toBe("evt_failed_123");
    expect(event.eventType).toBe("payment_intent.payment_failed");
    expect(event.consultationId).toBe("con_fail_123");
    expect(event.paymentIntentId).toBe("pi_failed_123");
  });

  it("throws AppError when webhook signature is invalid", async () => {
    await expect(
      gateway.verifyWebhookSignature("raw_payload", "invalid_sig")
    ).rejects.toThrow(AppError);
  });

  it("processes refunds and returns refundId and status", async () => {
    const refund = await gateway.refund({
      transactionId: "pi_test_123",
      amount: 1000,
      reason: "requested_by_customer",
    });

    expect(refund.refundId).toBe("re_test_12345");
    expect(refund.status).toBe("succeeded");
    expect(refund.amountRefunded).toBe(1000);
  });

  it("throws AppError if transactionId is missing for refund", async () => {
    await expect(
      gateway.refund({
        amount: 1000,
      })
    ).rejects.toThrow(AppError);
  });

  it("throws AppError when stripe refund API fails", async () => {
    await expect(
      gateway.refund({
        transactionId: "pi_error",
        amount: 500,
      })
    ).rejects.toThrow(AppError);
  });
});

describe("Payment Gateway - SSLCommerz Adapter & Factory", () => {
  it("creates checkout session with SSLCommerz adapter", async () => {
    const sslGateway = new SSLCommerzGateway("test_store_id", "test_store_pass", false);
    const result = await sslGateway.createCheckoutSession({
      consultationId: "con_ssl_123",
      amount: 1500,
    });

    expect(result.sessionId).toContain("ssl_");
    expect(result.url).toContain("sandbox.sslcommerz.com");
    expect(result.amount).toBe(1500);
  });

  it("verifies webhook payload with SSLCommerz IPN", async () => {
    const sslGateway = new SSLCommerzGateway();
    const payload = JSON.stringify({
      val_id: "ssl_val_789",
      tran_id: "ssl_tran_789",
      amount: "1500.00",
      status: "VALID",
      value_a: "con_ssl_123",
      value_b: "pay_ssl_123",
    });

    const event = await sslGateway.verifyWebhookSignature(payload, "");
    expect(event.eventId).toBe("ssl_val_789");
    expect(event.eventType).toBe("checkout.session.completed");
    expect(event.consultationId).toBe("con_ssl_123");
    expect(event.amountTotal).toBe(1500);
  });

  it("factory resolves correct gateway instance based on provider", () => {
    const stripeInst = getPaymentGateway("STRIPE");
    expect(stripeInst.providerName).toBe("STRIPE");

    const sslInst = getPaymentGateway("SSLCOMMERZ");
    expect(sslInst.providerName).toBe("SSLCOMMERZ");
  });
});
