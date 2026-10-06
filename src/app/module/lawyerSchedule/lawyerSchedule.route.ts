import express from "express";
import { LawyerScheduleController } from "./lawyerSchedule.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Lawyer availability slot mapping routes (PRD Section 6).
 */
router.post(
  "/",
  checkAuth(Role.LAWYER),
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
  LawyerScheduleController.removeSlot
);

export const LawyerScheduleRoutes = router;
export default LawyerScheduleRoutes;
