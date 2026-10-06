import express from "express";
import { AuditController } from "./audit.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Compliance audit logging routes (PRD Section 6).
 */
router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuditController.getAuditLogs
);

export const AuditRoutes = router;
export default AuditRoutes;
