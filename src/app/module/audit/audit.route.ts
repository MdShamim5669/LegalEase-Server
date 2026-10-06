import express from "express";
import { AuditController } from "./audit.controller";
import { AuditValidation } from "./audit.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Compliance audit logging routes (PRD Section 6).
 */
router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(AuditValidation.getAuditLogsSchema),
  AuditController.getAuditLogs
);

export const AuditRoutes = router;
export default AuditRoutes;
