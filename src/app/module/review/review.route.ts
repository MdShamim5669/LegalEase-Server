import express from "express";
import { ReviewController } from "./review.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Client review and administrative moderation routes (PRD Section 6).
 */
router.post(
  "/",
  checkAuth(Role.CLIENT),
  ReviewController.createReview
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.getAllReviews
);

router.patch(
  "/:id/visibility",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReviewController.updateVisibility
);

export const ReviewRoutes = router;
export default ReviewRoutes;
