import express from "express";
import { ClientController } from "./client.controller";
import { ClientValidation } from "./client.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums.js";

const router = express.Router();

/**
 * Client profile routes (PRD Section 6).
 */
router.get("/me", checkAuth(Role.CLIENT), ClientController.getMyProfile);

router.patch(
  "/me",
  checkAuth(Role.CLIENT),
  validateRequest(ClientValidation.updateProfileSchema),
  ClientController.updateMyProfile
);

router.delete("/me", checkAuth(Role.CLIENT), ClientController.deleteMyProfile);

export const ClientRoutes = router;
export default ClientRoutes;
