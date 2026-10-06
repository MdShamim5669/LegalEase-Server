import express from "express";
import { DashboardController } from "./dashboard.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Role-based dashboard analytics and overview routes (PRD Section 6).
 */
router.get(
  "/client",
  checkAuth(Role.CLIENT),
  DashboardController.getClientDashboard
);

router.get(
  "/lawyer",
  checkAuth(Role.LAWYER),
  DashboardController.getLawyerDashboard
);

router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  DashboardController.getAdminDashboard
);

export const DashboardRoutes = router;
export default DashboardRoutes;
