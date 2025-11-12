import { Server as SocketIOServer } from "socket.io";
import { logger } from "../utils/logger";

/**
 * WebSocket service for real-time event broadcasting
 */
export class WebSocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize WebSocket service with Socket.IO instance
   */
  initialize(io: SocketIOServer) {
    this.io = io;
    logger.info("WebSocket service initialized");
  }

  /**
   * Get the Socket.IO instance
   */
  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error(
        "WebSocket service not initialized. Call initialize() first."
      );
    }
    return this.io;
  }

  /**
   * Broadcast new feedback event to dashboard room
   */
  broadcastNewFeedback(feedback: any) {
    if (!this.io) return;

    try {
      // Broadcast to general dashboard room
      this.io.to("dashboard").emit("feedback:new", {
        type: "feedback:new",
        data: feedback,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to channel-specific room
      this.io.to(`feedback-${feedback.channel}`).emit("feedback:new", {
        type: "feedback:new",
        data: feedback,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `Broadcasted new feedback: ${feedback.id} to channel ${feedback.channel}`
      );
    } catch (error) {
      logger.error("Error broadcasting new feedback:", error);
    }
  }

  /**
   * Broadcast new alert event
   */
  broadcastNewAlert(alert: any) {
    if (!this.io) return;

    try {
      // Broadcast to alerts room
      this.io.to("alerts").emit("alert:new", {
        type: "alert:new",
        data: alert,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to dashboard for critical alerts
      if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
        this.io.to("dashboard").emit("alert:critical", {
          type: "alert:critical",
          data: alert,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Broadcasted new alert: ${alert.id} (${alert.severity})`);
    } catch (error) {
      logger.error("Error broadcasting new alert:", error);
    }
  }

  /**
   * Broadcast alert update (status change, assignment, etc.)
   */
  broadcastAlertUpdate(alert: any) {
    if (!this.io) return;

    try {
      this.io.to("alerts").emit("alert:updated", {
        type: "alert:updated",
        data: alert,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Broadcasted alert update: ${alert.id}`);
    } catch (error) {
      logger.error("Error broadcasting alert update:", error);
    }
  }

  /**
   * Broadcast metric updates to dashboard
   */
  broadcastMetricUpdate(metrics: any) {
    if (!this.io) return;

    try {
      this.io.to("dashboard").emit("metrics:update", {
        type: "metrics:update",
        data: metrics,
        timestamp: new Date().toISOString(),
      });

      logger.info("Broadcasted metrics update to dashboard");
    } catch (error) {
      logger.error("Error broadcasting metrics update:", error);
    }
  }

  /**
   * Broadcast sentiment analysis completion
   */
  broadcastSentimentAnalyzed(feedbackId: string, sentiment: any) {
    if (!this.io) return;

    try {
      this.io.to("dashboard").emit("sentiment:analyzed", {
        type: "sentiment:analyzed",
        data: {
          feedbackId,
          sentiment,
        },
        timestamp: new Date().toISOString(),
      });

      logger.info(`Broadcasted sentiment analysis for feedback: ${feedbackId}`);
    } catch (error) {
      logger.error("Error broadcasting sentiment analysis:", error);
    }
  }

  /**
   * Broadcast topic update (new topic, trending, etc.)
   */
  broadcastTopicUpdate(topic: any, action: "created" | "updated" | "trending") {
    if (!this.io) return;

    try {
      this.io.to("dashboard").emit("topic:update", {
        type: "topic:update",
        action,
        data: topic,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Broadcasted topic ${action}: ${topic.id}`);
    } catch (error) {
      logger.error("Error broadcasting topic update:", error);
    }
  }

  /**
   * Send message to a specific room
   */
  sendToRoom(room: string, event: string, data: any) {
    if (!this.io) return;

    try {
      this.io.to(room).emit(event, {
        type: event,
        data,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Sent ${event} to room: ${room}`);
    } catch (error) {
      logger.error(`Error sending ${event} to room ${room}:`, error);
    }
  }

  /**
   * Send message to a specific user (by socket ID)
   */
  sendToUser(socketId: string, event: string, data: any) {
    if (!this.io) return;

    try {
      this.io.to(socketId).emit(event, {
        type: event,
        data,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Sent ${event} to user: ${socketId}`);
    } catch (error) {
      logger.error(`Error sending ${event} to user ${socketId}:`, error);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(event: string, data: any) {
    if (!this.io) return;

    try {
      this.io.emit(event, {
        type: event,
        data,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Broadcasted ${event} to all clients`);
    } catch (error) {
      logger.error(`Error broadcasting ${event} to all:`, error);
    }
  }

  /**
   * Get number of connected clients in a room
   */
  async getRoomSize(room: string): Promise<number> {
    if (!this.io) return 0;

    try {
      const sockets = await this.io.in(room).fetchSockets();
      return sockets.length;
    } catch (error) {
      logger.error(`Error getting room size for ${room}:`, error);
      return 0;
    }
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): string[] {
    if (!this.io) return [];

    try {
      const rooms = this.io.sockets.adapter.rooms;
      return Array.from(rooms.keys());
    } catch (error) {
      logger.error("Error getting active rooms:", error);
      return [];
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
