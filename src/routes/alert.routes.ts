import { Router } from "express";
import {
  getAlerts,
  createAlert,
  getAlertStats,
  getAlertById,
  updateAlert,
  assignAlert,
  resolveAlert,
} from "../controllers/alert.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  requireAdmin,
  requireManagerOrAdmin,
} from "../middleware/role.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createAlertSchema,
  updateAlertSchema,
  assignAlertSchema,
  resolveAlertSchema,
} from "../validators/alert.validators";

const router: Router = Router();

// All routes require authentication and MANAGER+ role (except create which requires ADMIN)
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Get alerts with filters
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SENTIMENT_SPIKE, HIGH_VOLUME_NEGATIVE, TRENDING_TOPIC, ANOMALY_DETECTED, CUSTOM]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, DISMISSED]
 *       - in: query
 *         name: assignedToId
 *         schema:
 *           type: string
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
 *         description: Alerts retrieved successfully
 */
router.get("/", requireManagerOrAdmin, getAlerts);

/**
 * @swagger
 * /api/v1/alerts/stats:
 *   get:
 *     summary: Get alert statistics
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert statistics
 */
router.get("/stats", requireManagerOrAdmin, getAlertStats);

/**
 * @swagger
 * /api/v1/alerts:
 *   post:
 *     summary: Create a new alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - severity
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SENTIMENT_SPIKE, HIGH_VOLUME_NEGATIVE, TRENDING_TOPIC, ANOMALY_DETECTED, CUSTOM]
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               threshold:
 *                 type: object
 *               dataSnapshot:
 *                 type: object
 *     responses:
 *       201:
 *         description: Alert created successfully
 */
router.post("/", requireAdmin, validateRequest(createAlertSchema), createAlert);

/**
 * @swagger
 * /api/v1/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     tags: [Alerts]
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
 *         description: Alert retrieved successfully
 *       404:
 *         description: Alert not found
 */
router.get("/:id", requireManagerOrAdmin, getAlertById);

/**
 * @swagger
 * /api/v1/alerts/{id}:
 *   patch:
 *     summary: Update alert status or read state
 *     tags: [Alerts]
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
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, RESOLVED, DISMISSED]
 *     responses:
 *       200:
 *         description: Alert updated successfully
 */
router.patch(
  "/:id",
  requireManagerOrAdmin,
  validateRequest(updateAlertSchema),
  updateAlert
);

/**
 * @swagger
 * /api/v1/alerts/{id}/assign:
 *   post:
 *     summary: Assign alert to a user
 *     tags: [Alerts]
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert assigned successfully
 */
router.post(
  "/:id/assign",
  requireManagerOrAdmin,
  validateRequest(assignAlertSchema),
  assignAlert
);

/**
 * @swagger
 * /api/v1/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     tags: [Alerts]
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
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 */
router.post(
  "/:id/resolve",
  requireManagerOrAdmin,
  validateRequest(resolveAlertSchema),
  resolveAlert
);

export default router;
