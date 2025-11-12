import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  changePassword,
  getProfile,
} from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validation.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rateLimit.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../validators/auth.validators";

const router: Router = Router();

// Public routes (no auth required)
router.post(
  "/register",
  authLimiter,
  validateRequest(registerSchema),
  register
);
router.post("/login", authLimiter, validateRequest(loginSchema), login);
router.post("/refresh", validateRequest(refreshTokenSchema), refresh);

// Protected routes (auth required)
router.post("/logout", authMiddleware, logout);
router.post(
  "/change-password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  changePassword
);
router.get("/me", authMiddleware, getProfile);

export default router;
