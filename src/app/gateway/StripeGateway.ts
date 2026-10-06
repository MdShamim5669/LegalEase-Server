import Stripe from "stripe";
import env from "../config/env";
import {
  PaymentGateway,
  ICreateCheckoutSessionParams,
  ICheckoutSessionResult,
  IWebhookEvent,
  IRefundParams,
  IRefundResult,
} from "./PaymentGateway";
import { AppError } from "../errorHelpers/AppError";
import status from "http-status";

export class StripeGateway implements PaymentGateway {
  readonly providerName = "STRIPE";
  private stripe: Stripe;

  constructor(secretKey: string = env.STRIPE_SECRET_KEY) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as any,
      typescript: true,
    });
  }

  /**
   * Generates a hosted Stripe Checkout session for a consultation in integer BDT.
   * Conforms to PRD Section 4.4 (PAY-1) & Sequence Diagram 2.7.
   */
  async createCheckoutSession(
    params: ICreateCheckoutSessionParams
  ): Promise<ICheckoutSessionResult> {
    try {
      const successUrl =
        params.successUrl ||
        `${env.FRONTEND_URL}/dashboard/consultations/${params.consultationId}?payment=success`;
      const cancelUrl =
        params.cancelUrl ||
        `${env.FRONTEND_URL}/dashboard/consultations/${params.consultationId}?payment=canceled`;

      const session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: params.clientEmail,
        line_items: [
          {
            price_data: {
              currency: env.PAYMENT_CURRENCY.toLowerCase(),
              unit_amount: Math.round(params.amount * 100), // Stripe operates in minor currency units (poisha)
              product_data: {
                name: `Legal Consultation ${params.lawyerName ? `with ${params.lawyerName}` : ""}`.trim(),
                description: `30-minute legal consultation (ID: ${params.consultationId})`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          consultationId: params.consultationId,
          paymentId: params.paymentId || "",
          ...params.metadata,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      return {
        sessionId: session.id,
        url: session.url,
        currency: session.currency || env.PAYMENT_CURRENCY,
        amount: params.amount,
        paymentIntentId,
      };
    } catch (error: any) {
      throw new AppError(
        status.BAD_GATEWAY,
        `Stripe checkout creation failed: ${error.message || "Unknown error"}`,
        "PAYMENT_GATEWAY_ERROR"
      );
    }
  }

  /**
   * Cryptographically verifies the incoming raw Stripe webhook payload.
   * Conforms to PRD Section 4.4 (PAY-2, PAY-3, PAY-4, PAY-5) & Rule BL-9.
   */
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Promise<IWebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      let consultationId: string | undefined;
      let paymentId: string | undefined;
      let amountTotal: number | undefined;
      let paymentIntentId: string | undefined;
      let currency: string | undefined;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        consultationId = session.metadata?.consultationId;
        paymentId = session.metadata?.paymentId;
        currency = session.currency || undefined;
        if (session.amount_total !== null && session.amount_total !== undefined) {
          amountTotal = Math.round(session.amount_total / 100); // Convert poisha back to integer BDT taka
        }
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
      } else if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        consultationId = session.metadata?.consultationId;
        paymentId = session.metadata?.paymentId;
        currency = session.currency || undefined;
      } else if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Stripe.PaymentIntent;
        consultationId = pi.metadata?.consultationId;
        paymentId = pi.metadata?.paymentId;
        paymentIntentId = pi.id;
        currency = pi.currency;
      } else if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        currency = charge.currency;
      }

      return {
        eventId: event.id,
        eventType: event.type,
        consultationId,
        paymentId,
        amountTotal,
        currency,
        paymentIntentId,
        rawEvent: event,
      };
    } catch (error: any) {
      throw new AppError(
        status.BAD_REQUEST,
        `Stripe webhook signature verification failed: ${error.message || "Invalid signature"}`,
        "INVALID_WEBHOOK_SIGNATURE"
      );
    }
  }

  /**
   * Refunds a paid transaction via Stripe.
   * Conforms to PRD Section 4.4 (PAY-6), Rule BL-8, Rule BL-20 & BR-12.
   */
  async refund(params: IRefundParams): Promise<IRefundResult> {
    try {
      const paymentIntentId =
        params.transactionId ||
        (params.paymentGatewayData as any)?.payment_intent ||
        (params.paymentGatewayData as any)?.id;

      if (!paymentIntentId) {
        throw new AppError(
          status.BAD_REQUEST,
          "Payment intent ID or transaction ID is required for refund processing",
          "MISSING_TRANSACTION_ID"
        );
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(params.amount * 100), // Convert taka to minor units (poisha)
        reason: (params.reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
      });

      return {
        refundId: refund.id,
        status: refund.status || "succeeded",
        amountRefunded: Math.round(refund.amount / 100),
        rawRefund: refund,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        status.BAD_GATEWAY,
        `Stripe refund processing failed: ${error.message || "Refund error"}`,
        "REFUND_FAILED"
      );
    }
  }
}

export const stripeGateway = new StripeGateway();
export default stripeGateway;
