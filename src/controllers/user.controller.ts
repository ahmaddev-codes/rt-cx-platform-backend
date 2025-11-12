import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { ApiResponse } from "../types/api.types";

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create new user (ADMIN only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, AGENT, API_USER]
 *     responses:
 *       201:
 *         description: User created successfully
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;

  const user = await userService.createUser(data);

  const response: ApiResponse = {
    status: "ok",
    data: user,
  };

  res.status(201).json(response);
});

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (MANAGER+)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    role: req.query.role as any,
    isActive:
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined,
    search: req.query.search as string,
  };

  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sort: req.query.sort as string,
  };

  const result = await userService.getUsers(filters, pagination);

  const response: ApiResponse = {
    status: "ok",
    data: result,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await userService.getUserById(id);

  const response: ApiResponse = {
    status: "ok",
    data: user,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
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
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const user = await userService.updateUser(id, data);

  const response: ApiResponse = {
    status: "ok",
    data: user,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (ADMIN only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await userService.deleteUser(id);

  const response: ApiResponse = {
    status: "ok",
    data: { message: "User deleted successfully" },
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle user status
 *     tags: [Users]
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
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
export const toggleUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await userService.toggleUserStatus(id, isActive);

    const response: ApiResponse = {
      status: "ok",
      data: user,
    };

    res.json(response);
  }
);
