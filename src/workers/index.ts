import { Queue } from "bullmq";
import { redisClient } from "../utils/redis";
import { logger } from "../utils/logger";
import { sentimentWorker } from "./sentiment.worker";
import { NLP_CONFIG } from "../config/nlp";

/**
 * Sentiment analysis queue
 */
export const sentimentQueue = new Queue("sentiment-analysis", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: NLP_CONFIG.PROCESSING.RETRY_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: NLP_CONFIG.PROCESSING.RETRY_DELAY,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

/**
 * Initialize workers and queues
 */
export async function initializeWorkers(): Promise<void> {
  logger.info("Initializing background workers...");

  try {
    // Test Redis connection
    await redisClient.ping();
    logger.info("Redis connection established");

    // Worker is already initialized via import
    logger.info("Sentiment analysis worker initialized");

    // Log queue status
    const jobCounts = await sentimentQueue.getJobCounts();
    logger.info("Sentiment queue status", { counts: jobCounts });

    logger.info("Background workers initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize background workers", { error });
    throw error;
  }
}

/**
 * Graceful shutdown of all workers
 */
export async function shutdownWorkers(): Promise<void> {
  logger.info("Shutting down background workers...");

  try {
    await sentimentWorker.close();
    await sentimentQueue.close();
    logger.info("Background workers shut down successfully");
  } catch (error) {
    logger.error("Error shutting down background workers", { error });
    throw error;
  }
}

// Handle process termination
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down workers...");
  await shutdownWorkers();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down workers...");
  await shutdownWorkers();
  process.exit(0);
});
