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

// Import routes (to be created)
// import authRoutes from './routes/auth.routes';
// import userRoutes from './routes/user.routes';
// import feedbackRoutes from './routes/feedback.routes';
// import dashboardRoutes from './routes/dashboard.routes';
// import alertRoutes from './routes/alert.routes';
// import topicRoutes from './routes/topic.routes';

export function createApp(): { app: Application; io: Server } {
  const app = express();
  const httpServer = createServer(app);

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
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
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  app.use(loggerMiddleware);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
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

  // API routes (uncomment when routes are created)
  // app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/users', userRoutes);
  // app.use('/api/v1/feedback', feedbackRoutes);
  // app.use('/api/v1/dashboard', dashboardRoutes);
  // app.use('/api/v1/alerts', alertRoutes);
  // app.use('/api/v1/topics', topicRoutes);

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

  // WebSocket connection handling
  io.on("connection", (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on("subscribe", (room: string) => {
      socket.join(room);
      logger.info(`Client ${socket.id} subscribed to ${room}`);
    });

    socket.on("unsubscribe", (room: string) => {
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Store io instance in app for use in routes
  app.set("io", io);

  return { app, io };
}
