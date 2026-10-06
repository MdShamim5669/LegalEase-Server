import express from "express";
import { AdminController } from "./admin.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Super Admin administrator management routes (PRD Section 6).
 */
router.get("/", checkAuth(Role.SUPER_ADMIN), AdminController.getAllAdmins);
router.get("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.getAdminById);
router.patch("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.updateAdmin);
router.delete("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;
export default AdminRoutes;
