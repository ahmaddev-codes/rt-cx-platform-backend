import { Request, Response } from "express";
import { feedbackService } from "../services/feedback.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { ApiResponse } from "../types/api.types";

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     summary: Create new feedback
 *     tags: [Feedback]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [IN_APP_SURVEY, CHATBOT, VOICE_CALL, SOCIAL_MEDIA, EMAIL, WEB_FORM, SMS]
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               source:
 *                 type: string
 *               customerSegment:
 *                 type: string
 *               journeyStage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Feedback created successfully
 */
export const createFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const data = { ...req.body, userId };

    const feedback = await feedbackService.createFeedback(data);

    const response: ApiResponse = {
      status: "ok",
      data: feedback,
    };

    res.status(201).json(response);
  }
);

/**
 * @swagger
 * /api/v1/feedback/bulk:
 *   post:
 *     summary: Create multiple feedback entries
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feedbacks
 *             properties:
 *               feedbacks:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Feedback created successfully
 */
export const bulkCreateFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { feedbacks } = req.body;

    const data = feedbacks.map((f: any) => ({ ...f, userId }));
    const result = await feedbackService.bulkCreateFeedback(data);

    const response: ApiResponse = {
      status: "ok",
      data: result,
    };

    res.status(201).json(response);
  }
);

/**
 * @swagger
 * /api/v1/feedback:
 *   get:
 *     summary: Get feedback with filters
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *       - in: query
 *         name: sentiment
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
 *         description: Feedback retrieved successfully
 */
export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    channel: req.query.channel as any,
    sentiment: req.query.sentiment as any,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    customerSegment: req.query.customerSegment as string,
    processed:
      req.query.processed === "true"
        ? true
        : req.query.processed === "false"
          ? false
          : undefined,
  };

  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sort: req.query.sort as string,
  };

  const result = await feedbackService.getFeedback(filters, pagination);

  const response: ApiResponse = {
    status: "ok",
    data: result,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/v1/feedback/{id}:
 *   get:
 *     summary: Get feedback by ID
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *       404:
 *         description: Feedback not found
 */
export const getFeedbackById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const feedback = await feedbackService.getFeedbackById(id);

    const response: ApiResponse = {
      status: "ok",
      data: feedback,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/feedback/stats/channels:
 *   get:
 *     summary: Get channel statistics
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Channel stats retrieved successfully
 */
export const getChannelStats = asyncHandler(
  async (req: Request, res: Response) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const stats = await feedbackService.getChannelStats(startDate, endDate);

    const response: ApiResponse = {
      status: "ok",
      data: stats,
    };

    res.json(response);
  }
);
