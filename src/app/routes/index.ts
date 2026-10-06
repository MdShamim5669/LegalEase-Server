import express, { Request, Response } from "express";
import status from "http-status";
import { sendResponse } from "../utils/sendResponse";

import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { ClientRoutes } from "../module/client/client.route";
import { AdminRoutes } from "../module/admin/admin.route";
import { LawyerRoutes } from "../module/lawyer/lawyer.route";
import { PracticeAreaRoutes } from "../module/practiceArea/practiceArea.route";
import { ScheduleRoutes } from "../module/schedule/schedule.route";
import { LawyerScheduleRoutes } from "../module/lawyerSchedule/lawyerSchedule.route";
import { ConsultationRoutes } from "../module/consultation/consultation.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { ReviewRoutes } from "../module/review/review.route";
import { DashboardRoutes } from "../module/dashboard/dashboard.route";
import { AuditRoutes } from "../module/audit/audit.route";

const router = express.Router();

/**
 * Health check endpoint (PRD Section 6 & 8)
 */
router.get("/health", (_req: Request, res: Response) => {
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "LegalEase API is healthy",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * Module route mappings (PRD Section 6: API Endpoints Table).
 * Mounted under '/api/v1' in src/app.ts.
 */
const moduleRoutes = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/clients", route: ClientRoutes },
  { path: "/admins", route: AdminRoutes },
  { path: "/lawyers", route: LawyerRoutes },
  { path: "/practice-areas", route: PracticeAreaRoutes },
  { path: "/schedules", route: ScheduleRoutes },
  { path: "/lawyer-schedules", route: LawyerScheduleRoutes },
  { path: "/consultations", route: ConsultationRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/reviews", route: ReviewRoutes },
  { path: "/dashboard", route: DashboardRoutes },
  { path: "/audit-logs", route: AuditRoutes },
];

moduleRoutes.forEach((item) => {
  router.use(item.path, item.route);
});

// Alias for PRD Table 1184 direct /webhook path
router.use("/webhook", PaymentRoutes);

export const RootRouter = router;
export default RootRouter;
