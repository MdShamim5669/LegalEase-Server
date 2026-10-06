import express from "express";
import { LawyerScheduleController } from "./lawyerSchedule.controller";
import { LawyerScheduleValidation } from "./lawyerSchedule.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Lawyer availability slot mapping routes (PRD Section 6).
 */
router.post(
  "/",
  checkAuth(Role.LAWYER),
  validateRequest(LawyerScheduleValidation.pickSlotsSchema),
  LawyerScheduleController.pickSlots
);

router.get(
  "/my",
  checkAuth(Role.LAWYER),
  LawyerScheduleController.getMySlots
);

router.delete(
  "/:scheduleId",
  checkAuth(Role.LAWYER),
  validateRequest(LawyerScheduleValidation.removeSlotSchema),
  LawyerScheduleController.removeSlot
);

export const LawyerScheduleRoutes = router;
export default LawyerScheduleRoutes;
