import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { Server } from "socket.io";
import { createServer } from "http";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { wsService } from "./services/websocket.service";
import { verifyAccessToken } from "./utils/jwt";

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import feedbackRoutes from "./routes/feedback.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import alertRoutes from "./routes/alert.routes";
import topicRoutes from "./routes/topic.routes";
import demoRoutes from "./routes/demo.routes";

export function createApp(): { app: Application; io: Server } {
  const app = express();
  const httpServer = createServer(app);

  // Parse allowed origins from comma-separated FRONTEND_URL
  const allowedOrigins = env.FRONTEND_URL.split(",").map((url) => url.trim());

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Security middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  app.use(loggerMiddleware);

  // Health check
  app.get("/health", async (_req, res) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: "1.0.0",
      services: {
        database: "unknown",
        redis: "unknown",
        websocket: "active",
        workers: "unknown",
      },
    };

    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = "connected";
    } catch (error) {
      health.services.database = "disconnected";
      health.status = "degraded";
    }

    try {
      // Check Redis
      const { redis } = await import("./utils/redis");
      await redis.ping();
      health.services.redis = "connected";
      health.services.workers = "running";
    } catch (error) {
      health.services.redis = "disconnected";
      health.services.workers = "stopped";
      health.status = "degraded";
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // API documentation
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "RT-CX Platform API Documentation",
    })
  );

  // Rate limiting for API routes
  app.use("/api", apiLimiter);

  // API routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/feedback", feedbackRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/alerts", alertRoutes);
  app.use("/api/v1/topics", topicRoutes);
  app.use("/api/v1/admin", demoRoutes); // Demo/admin endpoints

  // Catch-all for undefined routes
  app.use("*", (req, res) => {
    res.status(404).json({
      status: "error",
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.originalUrl} not found`,
      },
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Initialize WebSocket service
  wsService.initialize(io);

  // WebSocket authentication middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.warn(
        `WebSocket connection rejected: No token provided (${socket.id})`
      );
      return next(new Error("Authentication required"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      logger.info(
        `WebSocket client authenticated: ${socket.id} (User: ${payload.userId})`
      );
      next();
    } catch (error) {
      logger.warn(
        `WebSocket connection rejected: Invalid token (${socket.id})`
      );
      return next(new Error("Invalid token"));
    }
  });

  // WebSocket connection handling
  io.on("connection", (socket) => {
    const userId = socket.data.user?.userId;
    logger.info(`WebSocket client connected: ${socket.id} (User: ${userId})`);

    // Auto-subscribe to user-specific room
    if (userId) {
      socket.join(`user-${userId}`);
    }

    // Handle room subscriptions
    socket.on("subscribe", (room: string) => {
      // Validate room access based on user role
      const allowedRooms = [
        "dashboard",
        "alerts",
        "feedback-IN_APP_SURVEY",
        "feedback-CHATBOT",
        "feedback-VOICE_CALL",
        "feedback-SOCIAL_MEDIA",
        "feedback-EMAIL",
        "feedback-WEB_FORM",
        "feedback-SMS",
      ];

      if (allowedRooms.includes(room) || room.startsWith("user-")) {
        socket.join(room);
        logger.info(`Client ${socket.id} subscribed to ${room}`);
        socket.emit("subscribed", {
          room,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn(
          `Client ${socket.id} attempted to subscribe to invalid room: ${room}`
        );
        socket.emit("error", { message: "Invalid room" });
      }
    });

    // Handle room unsubscriptions
    socket.on("unsubscribe", (room: string) => {
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);
      socket.emit("unsubscribed", {
        room,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    socket.on("disconnect", (reason) => {
      logger.info(
        `WebSocket client disconnected: ${socket.id} (User: ${userId}, Reason: ${reason})`
      );
    });

    socket.on("error", (error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
  });

  // Store io instance in app for use in routes
  app.set("io", io);

  return { app, io };
}
