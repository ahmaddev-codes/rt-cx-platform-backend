import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { ApiResponse } from "../types/api.types";

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
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
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  const result = await authService.register(email, password, name);

  const response: ApiResponse = {
    status: "ok",
    data: result,
  };

  res.status(201).json(response);
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
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
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  const response: ApiResponse = {
    status: "ok",
    data: result,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshToken(refreshToken);

  const response: ApiResponse = {
    status: "ok",
    data: result,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const userId = req.user!.userId;

  await authService.logout(userId, refreshToken);

  const response: ApiResponse = {
    status: "ok",
    data: { message: "Logout successful" },
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    await authService.changePassword(userId, oldPassword, newPassword);

    const response: ApiResponse = {
      status: "ok",
      data: { message: "Password changed successfully" },
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await authService.getUserById(userId);

  const response: ApiResponse = {
    status: "ok",
    data: user,
  };

  res.json(response);
});
