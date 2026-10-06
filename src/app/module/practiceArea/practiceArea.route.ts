import express from "express";
import { PracticeAreaController } from "./practiceArea.controller";
import { PracticeAreaValidation } from "./practiceArea.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Practice Area categorization routes (PRD Section 6).
 */
router.get("/", PracticeAreaController.getAllPracticeAreas);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PracticeAreaValidation.createPracticeAreaSchema),
  PracticeAreaController.createPracticeArea
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PracticeAreaValidation.updatePracticeAreaSchema),
  PracticeAreaController.updatePracticeArea
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  PracticeAreaController.deletePracticeArea
);

export const PracticeAreaRoutes = router;
export default PracticeAreaRoutes;
