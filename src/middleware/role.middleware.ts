import { Request, Response, NextFunction } from "express";
import { Role, ApiResponse } from "../types/api.types";

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        status: "error",
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      };
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole("ADMIN")(req, res, next);
}

export function requireManagerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole("ADMIN", "MANAGER")(req, res, next);
}
