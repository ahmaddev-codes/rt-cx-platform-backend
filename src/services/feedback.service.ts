import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler.middleware";
import { FeedbackChannel, Sentiment, Prisma } from "@prisma/client";
import { wsService } from "./websocket.service";
import { sentimentQueue } from "../workers/index";
import { logger } from "../utils/logger";

interface CreateFeedbackData {
  userId?: string;
  channel: FeedbackChannel;
  source?: string;
  rating?: number;
  comment?: string;
  metadata?: Record<string, any>;
  customerSegment?: string;
  journeyStage?: string;
}

interface FeedbackFilters {
  channel?: FeedbackChannel;
  sentiment?: Sentiment;
  startDate?: string;
  endDate?: string;
  customerSegment?: string;
  processed?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
}

export class FeedbackService {
  /**
   * Create feedback from any channel
   */
  async createFeedback(data: CreateFeedbackData) {
    const feedback = await prisma.feedback.create({
      data: {
        userId: data.userId,
        channel: data.channel,
        source: data.source,
        rating: data.rating,
        comment: data.comment,
        metadata: data.metadata as Prisma.InputJsonValue,
        customerSegment: data.customerSegment,
        journeyStage: data.journeyStage,
        processed: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Queue for sentiment analysis if there's a comment
    if (feedback.comment && feedback.comment.trim().length > 0) {
      try {
        // Determine priority based on customer segment (VIP = higher priority)
        const priority = data.customerSegment === "VIP" ? 1 : 5;

        await sentimentQueue.add(
          "analyze",
          {
            feedbackId: feedback.id,
            text: feedback.comment,
            priority,
            channelId: feedback.channel,
          },
          { priority }
        );

        logger.info(`Queued sentiment analysis for feedback: ${feedback.id}`, {
          priority,
          channel: feedback.channel,
        });
      } catch (error) {
        logger.error(
          `Failed to queue sentiment analysis for feedback: ${feedback.id}`,
          {
            error,
          }
        );
        // Don't fail the entire request if queueing fails
      }
    }

    // Broadcast new feedback via WebSocket
    wsService.broadcastNewFeedback(this.formatFeedback(feedback));

    return this.formatFeedback(feedback);
  }

  /**
   * Batch create feedback
   */
  async bulkCreateFeedback(feedbacks: CreateFeedbackData[]) {
    const created = await prisma.$transaction(
      feedbacks.map((data) =>
        prisma.feedback.create({
          data: {
            userId: data.userId,
            channel: data.channel,
            source: data.source,
            rating: data.rating,
            comment: data.comment,
            metadata: data.metadata as Prisma.InputJsonValue,
            customerSegment: data.customerSegment,
            journeyStage: data.journeyStage,
            processed: false,
          },
        })
      )
    );

    // Queue all for sentiment analysis
    for (const feedback of created) {
      if (feedback.comment && feedback.comment.trim().length > 0) {
        try {
          const priority = 5; // Normal priority for bulk imports

          await sentimentQueue.add(
            "analyze",
            {
              feedbackId: feedback.id,
              text: feedback.comment,
              priority,
              channelId: feedback.channel,
            },
            { priority }
          );
        } catch (error) {
          logger.error(
            `Failed to queue sentiment analysis for feedback: ${feedback.id}`,
            {
              error,
            }
          );
        }
      }
    }

    logger.info(
      `Queued ${created.length} feedback items for sentiment analysis`
    );

    return {
      count: created.length,
      feedbacks: created.map(this.formatFeedback),
    };
  }

  /**
   * Get feedback with filters and pagination
   */
  async getFeedback(filters: FeedbackFilters, pagination: PaginationParams) {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FeedbackWhereInput = {};

    if (filters.channel) {
      where.channel = filters.channel;
    }

    if (filters.customerSegment) {
      where.customerSegment = filters.customerSegment;
    }

    if (filters.processed !== undefined) {
      where.processed = filters.processed;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.sentiment) {
      where.sentimentAnalysis = {
        sentiment: filters.sentiment,
      };
    }

    // Get total count
    const total = await prisma.feedback.count({ where });

    // Get feedback
    const feedbacks = await prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      orderBy: this.parseSort(sort),
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        sentimentAnalysis: true,
        topics: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return {
      items: feedbacks.map(this.formatFeedback),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single feedback by ID
   */
  async getFeedbackById(id: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        sentimentAnalysis: true,
        topics: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new AppError(404, "FEEDBACK_NOT_FOUND", "Feedback not found");
    }

    return this.formatFeedback(feedback);
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.FeedbackWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await prisma.feedback.groupBy({
      by: ["channel"],
      where,
      _count: { id: true },
      _avg: { rating: true },
    });

    return stats.map((stat) => ({
      channel: stat.channel,
      count: stat._count.id,
      averageRating: stat._avg.rating || 0,
    }));
  }

  /**
   * Mark feedback as processed
   */
  async markAsProcessed(feedbackId: string) {
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { processed: true },
    });
  }

  /**
   * Parse sort parameter
   */
  private parseSort(sort?: string): Prisma.FeedbackOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: "desc" };
    }

    const [field, order] = sort.split(":");
    return { [field]: order === "asc" ? "asc" : "desc" };
  }

  /**
   * Format feedback for response
   */
  private formatFeedback(feedback: any) {
    return {
      ...feedback,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
      sentimentAnalysis: feedback.sentimentAnalysis
        ? {
            ...feedback.sentimentAnalysis,
            analyzedAt: feedback.sentimentAnalysis.analyzedAt.toISOString(),
          }
        : undefined,
    };
  }
}

export const feedbackService = new FeedbackService();
