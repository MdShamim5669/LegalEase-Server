import express from "express";
import { ConsultationController } from "./consultation.controller";
import { ConsultationValidation } from "./consultation.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Consultation lifecycle, booking, advice and document routes (PRD Section 6).
 */
router.post(
  "/book",
  checkAuth(Role.CLIENT),
  validateRequest(ConsultationValidation.bookConsultationSchema),
  ConsultationController.bookConsultation
);

router.post(
  "/book-pay-later",
  checkAuth(Role.CLIENT),
  validateRequest(ConsultationValidation.bookConsultationSchema),
  ConsultationController.bookPayLater
);

router.post(
  "/:id/pay",
  checkAuth(Role.CLIENT),
  ConsultationController.initiatePayment
);

router.get(
  "/my",
  checkAuth(Role.CLIENT, Role.LAWYER),
  ConsultationController.getMyConsultations
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ConsultationController.getAllConsultations
);

router.get(
  "/:id",
  checkAuth(Role.CLIENT, Role.LAWYER, Role.ADMIN, Role.SUPER_ADMIN),
  ConsultationController.getConsultationById
);

router.patch(
  "/:id/status",
  checkAuth(Role.LAWYER, Role.CLIENT, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ConsultationValidation.updateStatusSchema),
  ConsultationController.updateConsultationStatus
);

// Advice Note Endpoints
router.post(
  "/:id/advice",
  checkAuth(Role.LAWYER),
  validateRequest(ConsultationValidation.createAdviceSchema),
  ConsultationController.createAdvice
);

router.patch(
  "/:id/advice",
  checkAuth(Role.LAWYER),
  validateRequest(ConsultationValidation.updateAdviceSchema),
  ConsultationController.updateAdvice
);

router.get(
  "/:id/advice",
  checkAuth(Role.CLIENT, Role.LAWYER),
  ConsultationController.getAdvice
);

// Document Management Endpoints
router.post(
  "/:id/documents",
  checkAuth(Role.CLIENT),
  validateRequest(ConsultationValidation.uploadDocumentSchema),
  ConsultationController.uploadDocument
);

router.get(
  "/:id/documents",
  checkAuth(Role.CLIENT, Role.LAWYER),
  ConsultationController.getDocuments
);

router.delete(
  "/:id/documents/:docId",
  checkAuth(Role.CLIENT),
  ConsultationController.deleteDocument
);

export const ConsultationRoutes = router;
export default ConsultationRoutes;
