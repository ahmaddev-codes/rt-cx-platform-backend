import { Router } from "express";
import {
  createTopic,
  getTopics,
  getTrendingTopics,
  getTopicById,
  getTopicStats,
  updateTopic,
  deleteTopic,
} from "../controllers/topic.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  requireAdmin,
  requireManagerOrAdmin,
} from "../middleware/role.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import {
  createTopicSchema,
  updateTopicSchema,
} from "../validators/topic.validators";

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/topics:
 *   get:
 *     summary: Get topics with filters
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Topics retrieved successfully
 */
router.get("/", requireManagerOrAdmin, getTopics);

/**
 * @swagger
 * /api/v1/topics/trending:
 *   get:
 *     summary: Get trending topics
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Trending topics retrieved successfully
 */
router.get("/trending", requireManagerOrAdmin, getTrendingTopics);

/**
 * @swagger
 * /api/v1/topics:
 *   post:
 *     summary: Create a new topic
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               category:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       201:
 *         description: Topic created successfully
 */
router.post(
  "/",
  requireManagerOrAdmin,
  validateRequest(createTopicSchema),
  createTopic
);

/**
 * @swagger
 * /api/v1/topics/{id}:
 *   get:
 *     summary: Get topic by ID
 *     tags: [Topics]
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
 *         description: Topic retrieved successfully
 *       404:
 *         description: Topic not found
 */
router.get("/:id", requireManagerOrAdmin, getTopicById);

/**
 * @swagger
 * /api/v1/topics/{id}/stats:
 *   get:
 *     summary: Get topic statistics
 *     tags: [Topics]
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
 *         description: Topic statistics retrieved successfully
 */
router.get("/:id/stats", requireManagerOrAdmin, getTopicStats);

/**
 * @swagger
 * /api/v1/topics/{id}:
 *   put:
 *     summary: Update topic
 *     tags: [Topics]
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
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               category:
 *                 type: string
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Topic updated successfully
 */
router.put(
  "/:id",
  requireManagerOrAdmin,
  validateRequest(updateTopicSchema),
  updateTopic
);

/**
 * @swagger
 * /api/v1/topics/{id}:
 *   delete:
 *     summary: Delete topic
 *     tags: [Topics]
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
 *         description: Topic deleted successfully
 *       400:
 *         description: Topic is in use and cannot be deleted
 */
router.delete("/:id", requireAdmin, deleteTopic);

export default router;
