import { Router } from "express";
import {
  getOverallStats,
  getSentimentTrends,
  getChannelPerformance,
  getTrendingTopics,
  getEmotionBreakdown,
  getCustomerSegments,
  getJourneyStages,
} from "../controllers/dashboard.controller";
import { validateQuery } from "../middleware/validation.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireManagerOrAdmin } from "../middleware/role.middleware";
import {
  dateRangeSchema,
  sentimentTrendsSchema,
  topicsFilterSchema,
} from "../validators/dashboard.validators";

const router: Router = Router();

// All dashboard routes require authentication and MANAGER+ role
router.use(authMiddleware);
router.use(requireManagerOrAdmin);

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get overall dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *         description: Overall statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/stats", validateQuery(dateRangeSchema), getOverallStats);

/**
 * @swagger
 * /api/v1/dashboard/trends:
 *   get:
 *     summary: Get sentiment trends over time
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Sentiment trends retrieved successfully
 */
router.get("/trends", validateQuery(sentimentTrendsSchema), getSentimentTrends);

/**
 * @swagger
 * /api/v1/dashboard/channels:
 *   get:
 *     summary: Get channel performance metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *         description: Channel performance data retrieved successfully
 */
router.get("/channels", validateQuery(dateRangeSchema), getChannelPerformance);

/**
 * @swagger
 * /api/v1/dashboard/topics:
 *   get:
 *     summary: Get trending topics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trending topics retrieved successfully
 */
router.get("/topics", validateQuery(topicsFilterSchema), getTrendingTopics);

/**
 * @swagger
 * /api/v1/dashboard/emotions:
 *   get:
 *     summary: Get emotion breakdown
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *         description: Emotion breakdown retrieved successfully
 */
router.get("/emotions", validateQuery(dateRangeSchema), getEmotionBreakdown);

/**
 * @swagger
 * /api/v1/dashboard/segments:
 *   get:
 *     summary: Get customer segment analysis
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *         description: Customer segment analysis retrieved successfully
 */
router.get("/segments", validateQuery(dateRangeSchema), getCustomerSegments);

/**
 * @swagger
 * /api/v1/dashboard/journey:
 *   get:
 *     summary: Get journey stage analysis
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
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
 *         description: Journey stage analysis retrieved successfully
 */
router.get("/journey", validateQuery(dateRangeSchema), getJourneyStages);

export default router;
