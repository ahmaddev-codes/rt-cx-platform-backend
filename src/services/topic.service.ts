import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler.middleware";

interface CreateTopicInput {
  name: string;
  description?: string;
  category?: string;
}

interface UpdateTopicInput {
  name?: string;
  description?: string;
  category?: string;
}

interface TopicFilters {
  category?: string;
  search?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class TopicService {
  /**
   * Create a new topic
   */
  async createTopic(input: CreateTopicInput) {
    // Check if topic with same name exists
    const existingTopic = await prisma.topic.findUnique({
      where: { name: input.name },
    });

    if (existingTopic) {
      throw new AppError(
        409,
        "TOPIC_EXISTS",
        "Topic with this name already exists"
      );
    }

    const topic = await prisma.topic.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
      },
    });

    return topic;
  }

  /**
   * Get topics with filters and pagination
   */
  async getTopics(filters: TopicFilters, options: PaginationOptions = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.TopicWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { feedback: true },
          },
        },
      }),
      prisma.topic.count({ where }),
    ]);

    return {
      topics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get topic by ID
   */
  async getTopicById(id: string) {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        _count: {
          select: { feedback: true },
        },
      },
    });

    if (!topic) {
      throw new AppError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    return topic;
  }

  /**
   * Update topic
   */
  async updateTopic(id: string, data: UpdateTopicInput) {
    const topic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new AppError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    // Check if new name conflicts with existing topic
    if (data.name && data.name !== topic.name) {
      const existingTopic = await prisma.topic.findUnique({
        where: { name: data.name },
      });

      if (existingTopic) {
        throw new AppError(
          409,
          "TOPIC_EXISTS",
          "Topic with this name already exists"
        );
      }
    }

    const updated = await prisma.topic.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { feedback: true },
        },
      },
    });

    return updated;
  }

  /**
   * Delete topic
   */
  async deleteTopic(id: string) {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        _count: {
          select: { feedback: true },
        },
      },
    });

    if (!topic) {
      throw new AppError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    // Check if topic is being used
    if (topic._count.feedback > 0) {
      throw new AppError(
        400,
        "TOPIC_IN_USE",
        `Cannot delete topic. It is associated with ${topic._count.feedback} feedback entries`
      );
    }

    await prisma.topic.delete({
      where: { id },
    });

    return { message: "Topic deleted successfully" };
  }

  /**
   * Get topic statistics
   */
  async getTopicStats(id: string) {
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        feedback: {
          select: {
            rating: true,
            channel: true,
            createdAt: true,
            sentimentAnalysis: {
              select: {
                sentiment: true,
                primaryEmotion: true,
              },
            },
          },
        },
        _count: {
          select: { feedback: true },
        },
      },
    });

    if (!topic) {
      throw new AppError(404, "TOPIC_NOT_FOUND", "Topic not found");
    }

    // Calculate statistics
    const totalFeedback = topic._count.feedback;
    const feedbackWithRating = topic.feedback.filter((f) => f.rating !== null);
    const averageRating =
      feedbackWithRating.length > 0
        ? feedbackWithRating.reduce((sum, f) => sum + (f.rating || 0), 0) /
          feedbackWithRating.length
        : null;

    // Channel distribution
    const channelDistribution = topic.feedback.reduce(
      (acc, f) => {
        acc[f.channel] = (acc[f.channel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Sentiment distribution
    const sentimentDistribution = topic.feedback.reduce(
      (acc, f) => {
        if (f.sentimentAnalysis?.sentiment) {
          acc[f.sentimentAnalysis.sentiment] =
            (acc[f.sentimentAnalysis.sentiment] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentFeedback = topic.feedback.filter(
      (f) => f.createdAt >= sevenDaysAgo
    );

    return {
      topic: {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        category: topic.category,
      },
      stats: {
        totalFeedback,
        averageRating: averageRating
          ? parseFloat(averageRating.toFixed(2))
          : null,
        recentFeedbackCount: recentFeedback.length,
        channelDistribution,
        sentimentDistribution,
      },
    };
  }

  /**
   * Get trending topics (most mentioned in recent feedback)
   */
  async getTrendingTopics(limit: number = 10, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const topics = await prisma.topic.findMany({
      where: {
        feedback: {
          some: {
            createdAt: {
              gte: startDate,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            feedback: {
              where: {
                createdAt: {
                  gte: startDate,
                },
              },
            },
          },
        },
      },
      orderBy: {
        feedback: {
          _count: "desc",
        },
      },
      take: limit,
    });

    return topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      category: topic.category,
      mentionCount: topic._count.feedback,
    }));
  }
}

export const topicService = new TopicService();
