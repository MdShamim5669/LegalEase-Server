import express from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Payment processing and administrative refund routes (PRD Section 6).
 */
router.post("/webhook", PaymentController.handleWebhook);

router.post(
  "/:id/refund",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.refundPayment
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.getAllPayments
);

export const PaymentRoutes = router;
export default PaymentRoutes;
