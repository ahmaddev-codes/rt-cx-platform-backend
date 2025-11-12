import { Router } from "express";
import {
  seedDemo,
  resetDemo,
  getDemoStats,
  triggerDemoAlert,
} from "../controllers/demo.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router: Router = Router();

// All demo routes require ADMIN role
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

/**
 * @swagger
 * /api/admin/seed-demo:
 *   post:
 *     summary: Seed database with demo feedback data
 *     tags: [Admin - Demo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: number
 *                 default: 50
 *               organizationId:
 *                 type: string
 *                 default: bank-a
 *     responses:
 *       200:
 *         description: Demo data seeded successfully
 */
router.post("/seed-demo", seedDemo);

/**
 * @swagger
 * /api/admin/reset-demo:
 *   post:
 *     summary: Reset/clear all demo data
 *     tags: [Admin - Demo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Optional organization ID to filter reset
 *     responses:
 *       200:
 *         description: Demo data reset successfully
 */
router.post("/reset-demo", resetDemo);

/**
 * @swagger
 * /api/admin/demo-stats:
 *   get:
 *     summary: Get demo data statistics
 *     tags: [Admin - Demo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Optional organization ID to filter stats
 *     responses:
 *       200:
 *         description: Demo statistics retrieved
 */
router.get("/demo-stats", getDemoStats);

/**
 * @swagger
 * /api/admin/trigger-alert:
 *   post:
 *     summary: Manually trigger a demo alert
 *     tags: [Admin - Demo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SENTIMENT_SPIKE, HIGH_VOLUME_NEGATIVE, TRENDING_TOPIC, SYSTEM_ANOMALY]
 *                 default: SENTIMENT_SPIKE
 *               severity:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *                 default: HIGH
 *               organizationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Demo alert triggered successfully
 */
router.post("/trigger-alert", triggerDemoAlert);

export default router;
