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

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, AGENT, API_USER]
 *                 default: AGENT
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post("/", requireAdmin, validateRequest(createUserSchema), createUser);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users with filters (Manager+ role required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, MANAGER, AGENT, API_USER]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Forbidden - Manager or Admin role required
 */
router.get(
  "/",
  requireManagerOrAdmin,
  validateQuery(userFilterSchema),
  getUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get("/:id", getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user (Manager+ role required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, AGENT, API_USER]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put(
  "/:id",
  requireManagerOrAdmin,
  validateRequest(updateUserSchema),
  updateUser
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
router.delete("/:id", requireAdmin, deleteUser);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle user active status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
router.patch("/:id/status", requireAdmin, toggleUserStatus);

export default router;
