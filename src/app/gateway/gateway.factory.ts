import env from "../config/env";
import { PaymentGateway } from "./PaymentGateway";
import { stripeGateway } from "./StripeGateway";
import { sslCommerzGateway } from "./SSLCommerzGateway";

/**
 * Factory to retrieve active payment gateway based on environment configuration (PRD Decision D9).
 * Decouples consultation booking logic from specific payment providers.
 */
export const getPaymentGateway = (
  provider: string = env.PAYMENT_GATEWAY_PROVIDER
): PaymentGateway => {
  switch (provider.toUpperCase()) {
    case "SSLCOMMERZ":
      return sslCommerzGateway;
    case "STRIPE":
    default:
      return stripeGateway;
  }
};

export const defaultPaymentGateway = getPaymentGateway();
export default defaultPaymentGateway;
