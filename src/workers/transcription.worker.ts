import { Worker, Job } from "bullmq";
import { redisClient } from "../utils/redis";
import { transcriptionService } from "../services/transcription.service";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { sentimentQueue } from "./index";

interface TranscriptionJobData {
  feedbackId: string;
  audioUrl: string;
  transcriptId?: string; // AssemblyAI transcript ID
}

/**
 * Background worker for processing audio transcription
 */
export class TranscriptionWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      "transcription",
      async (job: Job<TranscriptionJobData>) => {
        return this.processJob(job);
      },
      {
        connection: redisClient,
        concurrency: 3, // Process 3 transcriptions in parallel
        limiter: {
          max: 10,
          duration: 60000, // Max 10 transcriptions per minute (AssemblyAI free tier)
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process transcription job
   */
  private async processJob(job: Job<TranscriptionJobData>): Promise<void> {
    const { feedbackId, audioUrl, transcriptId } = job.data;

    logger.info(`Processing transcription job for feedback: ${feedbackId}`, {
      jobId: job.id,
      audioUrl,
    });

    try {
      let currentTranscriptId = transcriptId;

      // Step 1: Submit transcription if not already submitted
      if (!currentTranscriptId) {
        currentTranscriptId =
          await transcriptionService.submitTranscription(audioUrl);

        // Update job data with transcript ID for retry purposes
        await job.updateData({
          ...job.data,
          transcriptId: currentTranscriptId,
        });

        logger.info(`Transcription submitted for feedback: ${feedbackId}`, {
          transcriptId: currentTranscriptId,
        });
      }

      // Step 2: Poll for completion
      const result = await transcriptionService.pollTranscription(
        currentTranscriptId,
        60, // 60 attempts
        5000 // 5 seconds interval = max 5 minutes
      );

      if (!result.text || result.text.trim().length === 0) {
        logger.warn(
          `Transcription completed but text is empty for feedback: ${feedbackId}`,
          {
            transcriptId: currentTranscriptId,
          }
        );
        throw new Error("Transcription returned empty text");
      }

      // Step 3: Update feedback with transcript
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          comment: result.text,
          metadata: {
            ...(await this.getFeedbackMetadata(feedbackId)),
            transcriptionStatus: "completed",
            transcriptId: currentTranscriptId,
            transcriptionConfidence: result.confidence,
            transcribedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(
        `Feedback updated with transcript for feedback: ${feedbackId}`,
        {
          transcriptId: currentTranscriptId,
          textLength: result.text.length,
          confidence: result.confidence,
        }
      );

      // Step 4: Delete old sentiment analysis (from placeholder text)
      await prisma.sentimentAnalysis.deleteMany({
        where: { feedbackId },
      });

      logger.info(`Deleted old sentiment analysis for feedback: ${feedbackId}`);

      // Step 5: Re-queue sentiment analysis with actual transcript
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId },
      });

      if (feedback) {
        await sentimentQueue.add(
          "analyze-sentiment",
          {
            feedbackId: feedback.id,
            text: result.text,
            channelId: feedback.channel,
          },
          {
            priority: 1, // High priority for transcribed audio
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          }
        );

        logger.info(`Re-queued sentiment analysis for feedback: ${feedbackId}`);
      }

      logger.info(`Transcription job completed for feedback: ${feedbackId}`, {
        jobId: job.id,
        transcriptId: currentTranscriptId,
      });
    } catch (error) {
      logger.error(`Transcription job failed for feedback: ${feedbackId}`, {
        jobId: job.id,
        error,
      });

      // Update feedback with error status
      await prisma.feedback
        .update({
          where: { id: feedbackId },
          data: {
            metadata: {
              ...(await this.getFeedbackMetadata(feedbackId)),
              transcriptionStatus: "failed",
              transcriptionError:
                error instanceof Error ? error.message : "Unknown error",
            },
          },
        })
        .catch((updateError) => {
          logger.error(`Failed to update feedback with error status`, {
            feedbackId,
            updateError,
          });
        });

      throw error; // Let BullMQ handle retries
    }
  }

  /**
   * Get current feedback metadata
   */
  private async getFeedbackMetadata(
    feedbackId: string
  ): Promise<Record<string, any>> {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: { metadata: true },
    });

    return (feedback?.metadata as Record<string, any>) || {};
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      logger.info(`Transcription job completed`, { jobId: job.id });
    });

    this.worker.on("failed", (job, error) => {
      logger.error(`Transcription job failed`, {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on("error", (error) => {
      logger.error(`Transcription worker error`, { error: error.message });
    });

    this.worker.on("stalled", (jobId) => {
      logger.warn(`Transcription job stalled`, { jobId });
    });
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    logger.info("Closing transcription worker...");
    await this.worker.close();
    logger.info("Transcription worker closed");
  }
}

// Export singleton instance
export const transcriptionWorker = new TranscriptionWorker();
