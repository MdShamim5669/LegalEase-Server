import express from "express";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Client review and administrative moderation routes (PRD Section 6).
 */
router.post(
  "/",
  checkAuth(Role.CLIENT),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewController.createReview
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.getReviewsSchema),
  ReviewController.getAllReviews
);

router.patch(
  "/:id/visibility",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.updateVisibilitySchema),
  ReviewController.updateVisibility
);

export const ReviewRoutes = router;
export default ReviewRoutes;
