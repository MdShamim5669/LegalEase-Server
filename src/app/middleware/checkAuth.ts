import { Request, Response, NextFunction } from "express";
import status from "http-status";
import { Role } from "../../generated/prisma/enums.js";
import { AppError } from "../errorHelpers/AppError";
import { verifyToken } from "../utils/jwt";
import env from "../config/env";
import { IAuthUser } from "../interfaces/auth.interface";

/**
 * Authentication and Role-Based Authorization Guard.
 * Conforms to PRD Section 2.8, 4.1 & Sequence Diagram 2.4.
 * Attaches decoded user identity to req.user and validates required roles.
 */
export const checkAuth = (...requiredRoles: Role[]) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let token = req.cookies?.accessToken;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }

      if (!token) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Authentication credentials were not provided",
          "UNAUTHENTICATED"
        );
      }

      let decoded: any;
      try {
        decoded = verifyToken(token, env.ACCESS_TOKEN_SECRET);
      } catch (_err) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Access token has expired or is invalid",
          "TOKEN_EXPIRED"
        );
      }

      const authUser: IAuthUser = {
        userId: decoded.userId || decoded.id || "",
        email: decoded.email || "",
        role: decoded.role as Role,
        status: decoded.status || "ACTIVE",
        profileId: decoded.profileId,
      };

      req.user = authUser;

      if (authUser.status === "BLOCKED") {
        throw new AppError(
          status.FORBIDDEN,
          "Your account has been suspended",
          "USER_BLOCKED"
        );
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(authUser.role)) {
        throw new AppError(
          status.FORBIDDEN,
          "You do not possess the required permissions for this action",
          "FORBIDDEN"
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export default checkAuth;
