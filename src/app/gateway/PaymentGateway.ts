export interface ICreateCheckoutSessionParams {
  consultationId: string;
  paymentId?: string;
  amount: number; // Integer BDT (taka)
  clientEmail?: string;
  clientName?: string;
  lawyerName?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface ICheckoutSessionResult {
  sessionId: string;
  url: string | null;
  currency: string;
  amount: number; // Integer BDT (taka)
  paymentIntentId?: string;
}

export interface IWebhookEvent {
  eventId: string;
  eventType: string; // e.g. "checkout.session.completed", "checkout.session.expired", "payment_intent.payment_failed"
  consultationId?: string;
  paymentId?: string;
  amountTotal?: number; // Integer BDT (taka)
  currency?: string;
  paymentIntentId?: string;
  rawEvent: unknown;
}

export interface IRefundParams {
  transactionId?: string;
  paymentGatewayData?: Record<string, unknown> | null;
  amount: number; // Integer BDT (taka)
  reason?: string;
}

export interface IRefundResult {
  refundId: string;
  status: string;
  amountRefunded: number; // Integer BDT (taka)
  rawRefund?: unknown;
}

/**
 * Universal payment gateway abstraction for LegalEase (PRD Design Decision D9 & PAY-7).
 * Decouples consultation booking logic from specific payment providers (Stripe, SSLCommerz, bKash).
 */
export interface PaymentGateway {
  readonly providerName: string;
  createCheckoutSession(params: ICreateCheckoutSessionParams): Promise<ICheckoutSessionResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<IWebhookEvent>;
  refund(params: IRefundParams): Promise<IRefundResult>;
}
