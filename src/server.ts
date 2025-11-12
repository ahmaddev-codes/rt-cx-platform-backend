import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { redis } from "./utils/redis";
import { initializeWorkers, shutdownWorkers } from "./workers/index";
import { sentimentService } from "./services/sentiment.service";

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("✅ Database connected");

    // Test Redis connection
    await redis.ping();
    logger.info("✅ Redis connected");

    // Initialize background workers
    await initializeWorkers();
    logger.info("✅ Background workers initialized");

    // Warm up NLP models
    await sentimentService.warmUpModels();
    logger.info("✅ NLP models warmed up");

    // Create and start server
    const { app, io } = createApp();
    const PORT = parseInt(env.PORT) || 4000;

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });

    // Attach Socket.IO to HTTP server
    server.on("upgrade", (request, socket, head) => {
      // engine.io expects the request to have a _query property;
      (request as any)._query = (request as any)._query || {};
      io.engine.handleUpgrade(request as any, socket, head);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        // Shutdown background workers
        await shutdownWorkers();
        logger.info("Background workers shut down");

        // Close database connection
        await prisma.$disconnect();
        logger.info("Database disconnected");

        // Close Redis connection
        await redis.quit();
        logger.info("Redis disconnected");

        // Close Socket.IO
        io.close(() => {
          logger.info("Socket.IO closed");
          process.exit(0);
        });
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      shutdown("unhandledRejection");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
