import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler.middleware";
import { feedbackService } from "./feedback.service";
import { FeedbackChannel } from "@prisma/client";
import { logger } from "../utils/logger";
import { cloudinary } from "../config/cloudinary";
import { transcriptionQueue } from "../workers/index";
import fs from "fs/promises";

export interface AudioMetadata {
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  secureUrl: string;
  originalName: string;
  mimetype: string;
  size: number;
  duration?: number;
  format: string;
}

export class AudioService {
  /**
   * Process uploaded audio and create voice feedback
   */
  async processAudioUpload(
    file: Express.Multer.File,
    userId?: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Validate file
      this.validateAudioFile(file);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: "video", // Cloudinary uses "video" for audio files
        folder: "wema-bank/voice-recordings",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      // Clean up local temp file
      await fs.unlink(file.path).catch((err) => {
        logger.warn(`Failed to delete temp file: ${file.path}`, { error: err });
      });

      // Store audio metadata
      const audioMetadata: AudioMetadata = {
        cloudinaryPublicId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        format: uploadResult.format,
        duration: uploadResult.duration,
      };

      // Create voice feedback entry
      const feedback = await feedbackService.createFeedback({
        userId,
        channel: FeedbackChannel.VOICE_CALL,
        source: "demo_upload",
        comment: "[Voice recording - awaiting transcription]",
        metadata: {
          ...metadata,
          audio: audioMetadata,
          transcriptionStatus: "pending",
        },
      });

      // Queue transcription job
      await transcriptionQueue.add(
        "transcribe-audio",
        {
          feedbackId: feedback.id,
          audioUrl: uploadResult.secure_url,
        },
        {
          priority: 2, // Medium priority
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      logger.info(
        `Audio uploaded to Cloudinary and feedback created: ${feedback.id}`,
        {
          publicId: uploadResult.public_id,
          size: file.size,
          userId,
          transcriptionQueued: true,
        }
      );

      return {
        feedbackId: feedback.id,
        audioUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        duration: uploadResult.duration,
        message: "Audio uploaded successfully. Transcription in progress...",
      };
    } catch (error) {
      // Clean up temp file on error
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }

      logger.error("Failed to upload audio to Cloudinary", { error });

      if (error instanceof Error) {
        throw new AppError(
          500,
          "CLOUDINARY_UPLOAD_FAILED",
          `Failed to upload audio: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate audio file format and size
   */
  private validateAudioFile(file: Express.Multer.File) {
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

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        400,
        "INVALID_AUDIO_FORMAT",
        `Invalid audio format. Allowed: WAV, MP3, WebM, M4A, OGG`
      );
    }

    // Max 50MB for demo
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new AppError(
        400,
        "AUDIO_TOO_LARGE",
        `Audio file too large. Maximum size: 50MB`
      );
    }
  }

  /**
   * Get audio URL from Cloudinary
   */
  async getAudioUrl(feedbackId: string): Promise<string> {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new AppError(404, "FEEDBACK_NOT_FOUND", "Feedback not found");
    }

    if (feedback.channel !== FeedbackChannel.VOICE_CALL) {
      throw new AppError(
        400,
        "NOT_VOICE_FEEDBACK",
        "This feedback is not a voice recording"
      );
    }

    const metadata = feedback.metadata as any;
    if (!metadata?.audio?.secureUrl) {
      throw new AppError(404, "AUDIO_NOT_FOUND", "Audio URL not found");
    }

    return metadata.audio.secureUrl;
  }

  /**
   * Delete audio from Cloudinary
   */
  async deleteAudio(feedbackId: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new AppError(404, "FEEDBACK_NOT_FOUND", "Feedback not found");
    }

    const metadata = feedback.metadata as any;
    const publicId = metadata?.audio?.cloudinaryPublicId;

    if (!publicId) {
      throw new AppError(404, "AUDIO_NOT_FOUND", "Audio public ID not found");
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      });

      logger.info(`Deleted audio from Cloudinary: ${publicId}`, { result });

      if (result.result !== "ok") {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
      }
    } catch (error) {
      logger.error(`Failed to delete audio from Cloudinary: ${publicId}`, {
        error,
      });
      throw new AppError(
        500,
        "DELETE_FAILED",
        "Failed to delete audio from Cloudinary"
      );
    }
  }
}

export const audioService = new AudioService();
