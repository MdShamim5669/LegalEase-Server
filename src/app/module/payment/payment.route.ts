import express from "express";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Payment processing and administrative refund routes (PRD Section 6 & Appendix A).
 */
router.post("/webhook", PaymentController.handleWebhook);

// SSLCommerz redirect and IPN callback routes
router.post("/sslcommerz/success", PaymentController.sslCommerzSuccess);
router.post("/sslcommerz/fail", PaymentController.sslCommerzFail);
router.post("/sslcommerz/cancel", PaymentController.sslCommerzCancel);
router.post("/sslcommerz/ipn", PaymentController.sslCommerzIpn);

router.post(
  "/:id/refund",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PaymentValidation.refundPaymentSchema),
  PaymentController.refundPayment
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PaymentValidation.getPaymentsSchema),
  PaymentController.getAllPayments
);

export const PaymentRoutes = router;
export default PaymentRoutes;
