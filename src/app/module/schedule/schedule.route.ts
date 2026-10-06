import express from "express";
import { ScheduleController } from "./schedule.controller";
import { ScheduleValidation } from "./schedule.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Universal schedule slot management routes (PRD Section 6).
 */
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ScheduleValidation.createScheduleSchema),
  ScheduleController.createSchedule
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.LAWYER),
  ScheduleController.getAllSchedules
);

router.get(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.LAWYER),
  ScheduleController.getScheduleById
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ScheduleValidation.updateScheduleSchema),
  ScheduleController.updateSchedule
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ScheduleController.deleteSchedule
);

export const ScheduleRoutes = router;
export default ScheduleRoutes;
