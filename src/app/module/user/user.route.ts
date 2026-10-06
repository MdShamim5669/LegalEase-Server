import express from "express";
import { UserController } from "./user.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * User administration routes (PRD Section 6).
 */
router.post(
  "/create-lawyer",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  UserController.createLawyer
);

router.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN),
  UserController.createAdmin
);

router.patch(
  "/:id/status",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  UserController.updateStatus
);

export const UserRoutes = router;
export default UserRoutes;
