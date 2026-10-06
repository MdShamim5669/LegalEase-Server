import express from "express";
import { PracticeAreaController } from "./practiceArea.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Practice Area categorization routes (PRD Section 6).
 */
router.get("/", PracticeAreaController.getAllPracticeAreas);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PracticeAreaController.createPracticeArea
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PracticeAreaController.updatePracticeArea
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PracticeAreaController.deletePracticeArea
);

export const PracticeAreaRoutes = router;
export default PracticeAreaRoutes;
