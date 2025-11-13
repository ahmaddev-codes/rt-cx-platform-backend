import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { audioController } from "../controllers/audio.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireManagerOrAdmin } from "../middleware/role.middleware";

const router: Router = Router();

// Configure multer for temporary storage (files will be uploaded to Cloudinary)
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    // Use OS temp directory for temporary storage before Cloudinary upload
    cb(null, os.tmpdir());
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `wema-audio-${uniqueSuffix}${ext}`);
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
 * /api/v1/audio/upload:
 *   post:
 *     tags: [Audio]
 *     summary: Upload voice recording for demo
 *     security:
 *       - bearerAuth: []
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
 *               metadata:
 *                 type: string
 *                 description: JSON string with additional metadata
 *     responses:
 *       201:
 *         description: Audio uploaded successfully
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("audio"),
  audioController.uploadAudio.bind(audioController)
);

/**
 * @swagger
 * /api/v1/audio/{feedbackId}/stream:
 *   get:
 *     tags: [Audio]
 *     summary: Stream audio file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audio stream
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  "/:feedbackId/stream",
  authMiddleware,
  audioController.streamAudio.bind(audioController)
);

/**
 * @swagger
 * /api/v1/audio/{feedbackId}:
 *   delete:
 *     tags: [Audio]
 *     summary: Delete audio file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audio deleted successfully
 */
router.delete(
  "/:feedbackId",
  authMiddleware,
  requireManagerOrAdmin,
  audioController.deleteAudio.bind(audioController)
);

export default router;
