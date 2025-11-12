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

// Overall statistics
router.get("/stats", validateQuery(dateRangeSchema), getOverallStats);

// Sentiment trends over time
router.get("/trends", validateQuery(sentimentTrendsSchema), getSentimentTrends);

// Channel performance
router.get("/channels", validateQuery(dateRangeSchema), getChannelPerformance);

// Trending topics
router.get("/topics", validateQuery(topicsFilterSchema), getTrendingTopics);

// Emotion breakdown
router.get("/emotions", validateQuery(dateRangeSchema), getEmotionBreakdown);

// Customer segment analysis
router.get("/segments", validateQuery(dateRangeSchema), getCustomerSegments);

// Journey stage analysis
router.get("/journey", validateQuery(dateRangeSchema), getJourneyStages);

export default router;
