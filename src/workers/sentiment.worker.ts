import { Worker, Job } from "bullmq";
import { redisClient } from "../utils/redis";
import { sentimentService } from "../services/sentiment.service";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { NLP_CONFIG } from "../config/nlp";
import {
  Sentiment,
  AlertSeverity,
  AlertType,
  FeedbackChannel,
} from "@prisma/client";

interface SentimentJobData {
  feedbackId: string;
  text: string;
  priority?: number;
  channelId?: FeedbackChannel;
}

/**
 * Background worker for processing sentiment analysis
 */
export class SentimentWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      "sentiment-analysis",
      async (job: Job<SentimentJobData>) => {
        return this.processJob(job);
      },
      {
        connection: redisClient,
        concurrency: NLP_CONFIG.PROCESSING.BATCH_SIZE,
        limiter: {
          max: 10,
          duration: 1000, // Max 10 jobs per second
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process sentiment analysis job
   */
  private async processJob(job: Job<SentimentJobData>): Promise<void> {
    const { feedbackId, text, channelId } = job.data;

    logger.info(
      `Processing sentiment analysis job for feedback: ${feedbackId}`,
      {
        jobId: job.id,
      }
    );

    try {
      // Analyze sentiment
      const analysis = await sentimentService.analyzeFeedback(feedbackId, text);

      // Store results
      await sentimentService.storeSentimentAnalysis(feedbackId, analysis);

      // Check alert thresholds
      if (channelId) {
        await this.checkAlertThresholds(channelId, analysis.sentiment);
      }

      logger.info(
        `Sentiment analysis job completed for feedback: ${feedbackId}`,
        {
          jobId: job.id,
          sentiment: analysis.sentiment,
        }
      );
    } catch (error) {
      logger.error(
        `Sentiment analysis job failed for feedback: ${feedbackId}`,
        {
          jobId: job.id,
          error,
        }
      );
      throw error; // Let BullMQ handle retries
    }
  }

  /**
   * Check if sentiment spikes should trigger alerts
   */
  private async checkAlertThresholds(
    channelId: FeedbackChannel,
    sentiment: Sentiment
  ): Promise<void> {
    const isNegative =
      sentiment === Sentiment.NEGATIVE || sentiment === Sentiment.VERY_NEGATIVE;

    if (!isNegative) return;

    const thresholds = NLP_CONFIG.ALERT_THRESHOLDS;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Count negative feedback in last hour
      const negativeCount1h = await prisma.sentimentAnalysis.count({
        where: {
          feedback: {
            channel: channelId,
          },
          sentiment: {
            in: [Sentiment.NEGATIVE, Sentiment.VERY_NEGATIVE],
          },
          analyzedAt: {
            gte: oneHourAgo,
          },
        },
      });

      // Check high volume negative threshold
      if (negativeCount1h >= thresholds.HIGH_VOLUME_NEGATIVE.COUNT_1H) {
        await this.createAlert(
          channelId,
          AlertType.HIGH_VOLUME_NEGATIVE,
          `High Volume Negative Feedback: ${channelId}`,
          `${negativeCount1h} negative feedback items in the last hour`,
          AlertSeverity.HIGH
        );
      }

      // Count total feedback in last hour for ratio calculation
      const totalCount1h = await prisma.sentimentAnalysis.count({
        where: {
          feedback: {
            channel: channelId,
          },
          analyzedAt: {
            gte: oneHourAgo,
          },
        },
      });

      // Check negative ratio threshold
      if (totalCount1h > 0) {
        const negativeRatio = negativeCount1h / totalCount1h;
        if (
          negativeRatio >= thresholds.SENTIMENT_SPIKE.NEGATIVE_RATIO_1H &&
          totalCount1h >= 10
        ) {
          await this.createAlert(
            channelId,
            AlertType.SENTIMENT_SPIKE,
            `Sentiment Spike: ${channelId}`,
            `${Math.round(negativeRatio * 100)}% negative feedback in the last hour`,
            AlertSeverity.CRITICAL
          );
        }
      }

      // Check spike threshold (1 hour)
      if (negativeCount1h >= thresholds.SENTIMENT_SPIKE.NEGATIVE_COUNT_1H) {
        await this.createAlert(
          channelId,
          AlertType.SENTIMENT_SPIKE,
          `Sentiment Spike: ${channelId}`,
          `${negativeCount1h} negative feedback items in the last hour`,
          AlertSeverity.HIGH
        );
      }

      // Count negative feedback in last 24 hours
      const negativeCount24h = await prisma.sentimentAnalysis.count({
        where: {
          feedback: {
            channel: channelId,
          },
          sentiment: {
            in: [Sentiment.NEGATIVE, Sentiment.VERY_NEGATIVE],
          },
          analyzedAt: {
            gte: twentyFourHoursAgo,
          },
        },
      });

      // Check spike threshold (24 hours)
      if (negativeCount24h >= thresholds.SENTIMENT_SPIKE.NEGATIVE_COUNT_24H) {
        await this.createAlert(
          channelId,
          AlertType.SENTIMENT_SPIKE,
          `Sentiment Spike: ${channelId}`,
          `${negativeCount24h} negative feedback items in the last 24 hours`,
          AlertSeverity.MEDIUM
        );
      }
    } catch (error) {
      logger.error(
        `Failed to check alert thresholds for channel: ${channelId}`,
        {
          error,
        }
      );
    }
  }

  /**
   * Create alert if it doesn't already exist
   */
  private async createAlert(
    channelId: FeedbackChannel,
    type: AlertType,
    title: string,
    message: string,
    severity: AlertSeverity
  ): Promise<void> {
    try {
      // Check if similar alert exists in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existingAlert = await prisma.alert.findFirst({
        where: {
          type,
          title: {
            contains: channelId,
          },
          createdAt: {
            gte: oneHourAgo,
          },
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
      });

      if (existingAlert) {
        logger.info(`Similar alert already exists, skipping creation`, {
          alertId: existingAlert.id,
          type,
        });
        return;
      }

      // Create new alert
      const alert = await prisma.alert.create({
        data: {
          type,
          severity,
          title,
          message,
          status: "OPEN",
        },
      });

      logger.info(`Created sentiment alert`, {
        alertId: alert.id,
        type,
        severity,
        channelId,
      });

      // Broadcast alert via WebSocket (imported dynamically to avoid circular deps)
      const { wsService } = await import("../services/websocket.service");
      wsService.broadcastNewAlert(alert);
    } catch (error) {
      logger.error(`Failed to create alert`, { type, channelId, error });
    }
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      logger.info(`Sentiment job completed`, { jobId: job.id });
    });

    this.worker.on("failed", (job, error) => {
      logger.error(`Sentiment job failed`, {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on("error", (error) => {
      logger.error(`Sentiment worker error`, { error: error.message });
    });

    this.worker.on("stalled", (jobId) => {
      logger.warn(`Sentiment job stalled`, { jobId });
    });
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    logger.info("Closing sentiment worker...");
    await this.worker.close();
    logger.info("Sentiment worker closed");
  }
}

// Export singleton instance
export const sentimentWorker = new SentimentWorker();
