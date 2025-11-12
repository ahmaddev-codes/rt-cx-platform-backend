import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../controllers/user.controller";
import {
  validateRequest,
  validateQuery,
} from "../middleware/validation.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  requireAdmin,
  requireManagerOrAdmin,
} from "../middleware/role.middleware";
import {
  createUserSchema,
  updateUserSchema,
  userFilterSchema,
} from "../validators/user.validators";

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create user (ADMIN only)
router.post("/", requireAdmin, validateRequest(createUserSchema), createUser);

// Get all users (MANAGER+)
router.get(
  "/",
  requireManagerOrAdmin,
  validateQuery(userFilterSchema),
  getUsers
);

// Get user by ID
router.get("/:id", getUserById);

// Update user (MANAGER+)
router.put(
  "/:id",
  requireManagerOrAdmin,
  validateRequest(updateUserSchema),
  updateUser
);

// Delete user (ADMIN only)
router.delete("/:id", requireAdmin, deleteUser);

// Toggle user status (ADMIN only)
router.patch("/:id/status", requireAdmin, toggleUserStatus);

export default router;
