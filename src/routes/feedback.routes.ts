import { Router } from "express";
import {
  createFeedback,
  bulkCreateFeedback,
  getFeedback,
  getFeedbackById,
  getChannelStats,
} from "../controllers/feedback.controller";
import {
  validateRequest,
  validateQuery,
} from "../middleware/validation.middleware";
import {
  optionalAuthMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware";
import { feedbackLimiter } from "../middleware/rateLimit.middleware";
import {
  createFeedbackSchema,
  bulkFeedbackSchema,
  feedbackFilterSchema,
} from "../validators/feedback.validators";

const router: Router = Router();

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     summary: Submit customer feedback
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
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Invalid input
 */
router.post(
  "/",
  optionalAuthMiddleware,
  feedbackLimiter,
  validateRequest(createFeedbackSchema),
  createFeedback
);

/**
 * @swagger
 * /api/v1/feedback/bulk:
 *   post:
 *     summary: Bulk create feedback (Admin only)
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedback:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Bulk feedback created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/bulk",
  authMiddleware,
  validateRequest(bulkFeedbackSchema),
  bulkCreateFeedback
);

/**
 * @swagger
 * /api/v1/feedback:
 *   get:
 *     summary: Get all feedback with filters
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
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
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  authMiddleware,
  validateQuery(feedbackFilterSchema),
  getFeedback
);

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
router.get("/:id", authMiddleware, getFeedbackById);

/**
 * @swagger
 * /api/v1/feedback/stats/channels:
 *   get:
 *     summary: Get channel statistics
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: Channel stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/stats/channels", authMiddleware, getChannelStats);

export default router;
