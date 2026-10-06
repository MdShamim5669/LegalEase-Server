import express from "express";
import { LawyerController } from "./lawyer.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Lawyer directory and management routes (PRD Section 6).
 */
router.get("/", LawyerController.getVerifiedLawyers);
router.get("/top", LawyerController.getTopLawyers);
router.get(
  "/admin/list",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  LawyerController.getAdminLawyerList
);
router.get("/:id", LawyerController.getLawyerById);
router.get("/:id/slots", LawyerController.getLawyerSlots);
router.get("/:id/reviews", LawyerController.getLawyerReviews);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.LAWYER),
  LawyerController.updateLawyer
);

router.patch(
  "/:id/verify",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  LawyerController.verifyLawyer
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  LawyerController.deleteLawyer
);

export const LawyerRoutes = router;
export default LawyerRoutes;
