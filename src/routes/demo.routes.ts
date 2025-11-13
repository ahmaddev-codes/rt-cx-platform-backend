import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import {
  seedDemo,
  resetDemo,
  getDemoStats,
  triggerDemoAlert,
  uploadDemoAudio,
} from "../controllers/demo.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router: Router = Router();

// Configure multer for demo audio uploads
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, os.tmpdir());
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `wema-demo-audio-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimeTypes = [
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/webm",
      "audio/ogg",
      "audio/m4a",
      "audio/x-m4a",
      "audio/mp4",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only WAV, MP3, WebM, M4A, and OGG are allowed."
        )
      );
    }
  },
});

/**
 * @swagger
 * /api/v1/admin/demo/upload-audio:
 *   post:
 *     summary: Upload demo voice recording (No Auth Required - Public Demo)
 *     tags: [Demo - Public]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (WAV, MP3, WebM, M4A, OGG)
 *               customerName:
 *                 type: string
 *                 description: Optional customer name
 *               customerEmail:
 *                 type: string
 *                 description: Optional customer email
 *     responses:
 *       201:
 *         description: Demo audio uploaded successfully
 */
router.post("/demo/upload-audio", upload.single("audio"), uploadDemoAudio);

// All other demo routes require ADMIN role
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
