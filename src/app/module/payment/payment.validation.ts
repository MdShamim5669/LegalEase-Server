import { z } from "zod";

const refundPaymentSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Payment ID is required" }),
  }),
  body: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});

const getPaymentsSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      status: z.enum(["UNPAID", "PAID", "FAILED", "REFUNDED"]).optional(),
    })
    .optional(),
});

export const PaymentValidation = {
  refundPaymentSchema,
  getPaymentsSchema,
};

export default PaymentValidation;
