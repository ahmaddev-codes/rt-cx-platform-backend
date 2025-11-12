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

// Create feedback (optional auth - can be anonymous)
router.post(
  "/",
  optionalAuthMiddleware,
  feedbackLimiter,
  validateRequest(createFeedbackSchema),
  createFeedback
);

// Bulk create (requires auth)
router.post(
  "/bulk",
  authMiddleware,
  validateRequest(bulkFeedbackSchema),
  bulkCreateFeedback
);

// Get feedback (requires auth)
router.get(
  "/",
  authMiddleware,
  validateQuery(feedbackFilterSchema),
  getFeedback
);

// Get single feedback (requires auth)
router.get("/:id", authMiddleware, getFeedbackById);

// Get channel stats (requires auth)
router.get("/stats/channels", authMiddleware, getChannelStats);

export default router;
