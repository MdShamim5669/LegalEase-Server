import express from "express";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * User administration routes (PRD Section 6).
 */
router.post(
  "/create-lawyer",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(UserValidation.createLawyerSchema),
  UserController.createLawyer
);

router.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.createAdminSchema),
  UserController.createAdmin
);

router.patch(
  "/:id/status",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(UserValidation.updateStatusSchema),
  UserController.updateStatus
);

export const UserRoutes = router;
export default UserRoutes;
