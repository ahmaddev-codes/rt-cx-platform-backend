import { prisma } from "../utils/prisma";
import { Prisma, FeedbackChannel, Sentiment, Emotion } from "@prisma/client";
import { getCached, setCached } from "../utils/redis";
import { CONSTANTS } from "../config/constants";

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export class DashboardService {
  /**
   * Get overall statistics
   */
  async getOverallStats(dateRange?: DateRange) {
    const cacheKey = `dashboard:stats:${dateRange?.startDate?.toISOString()}-${dateRange?.endDate?.toISOString()}`;

    // Try cache first
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const where: Prisma.FeedbackWhereInput = {};
    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    // Get total feedback count
    const totalFeedback = await prisma.feedback.count({ where });

    // Get average rating
    const avgResult = await prisma.feedback.aggregate({
      where: { ...where, rating: { not: null } },
      _avg: { rating: true },
    });

    // Get sentiment breakdown
    const sentimentBreakdown = await prisma.sentimentAnalysis.groupBy({
      by: ["sentiment"],
      where: dateRange
        ? {
            feedback: {
              createdAt: where.createdAt,
            },
          }
        : undefined,
      _count: { sentiment: true },
    });

    const sentimentMap = sentimentBreakdown.reduce(
      (acc, item) => {
        acc[item.sentiment.toLowerCase()] = item._count.sentiment;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get trending topics
    const trendingTopics = await this.getTrendingTopics(10, dateRange);

    // Get channel performance
    const channelPerformance = await this.getChannelPerformance(dateRange);

    // Get recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const stats = {
      totalFeedback,
      averageRating: avgResult._avg.rating || 0,
      sentimentBreakdown: {
        very_positive: sentimentMap["very_positive"] || 0,
        positive: sentimentMap["positive"] || 0,
        neutral: sentimentMap["neutral"] || 0,
        negative: sentimentMap["negative"] || 0,
        very_negative: sentimentMap["very_negative"] || 0,
      },
      trendingTopics,
      channelPerformance,
      recentAlerts: recentAlerts.map((alert) => ({
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString(),
      })),
    };

    // Cache for 1 minute
    await setCached(cacheKey, stats, CONSTANTS.CACHE_TTL.DASHBOARD_STATS);

    return stats;
  }

  /**
   * Get sentiment trends over time
   */
  async getSentimentTrends(
    interval: "hour" | "day" | "week" = "day",
    dateRange?: DateRange,
    channel?: FeedbackChannel
  ) {
    const where: Prisma.FeedbackWhereInput = {};

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    if (channel) {
      where.channel = channel;
    }

    // Get feedbacks with sentiment analysis
    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        sentimentAnalysis: {
          select: {
            sentiment: true,
            analyzedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by time interval
    const trends = this.groupByInterval(feedbacks, interval);

    return trends;
  }

  /**
   * Get channel performance metrics
   */
  async getChannelPerformance(dateRange?: DateRange) {
    const where: Prisma.FeedbackWhereInput = {};

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    const channelStats = await prisma.feedback.groupBy({
      by: ["channel"],
      where,
      _count: { id: true },
      _avg: { rating: true },
    });

    return channelStats.map((stat) => ({
      channel: stat.channel,
      count: stat._count.id,
      averageRating: stat._avg.rating || 0,
    }));
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10, dateRange?: DateRange) {
    const where: Prisma.FeedbackWhereInput = {};

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    // Get topics with feedback count
    const topics = await prisma.topic.findMany({
      include: {
        feedback: {
          where,
          select: { id: true },
        },
      },
    });

    const topicsWithCount = topics
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        category: topic.category,
        count: topic.feedback.length,
      }))
      .filter((topic) => topic.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topicsWithCount;
  }

  /**
   * Get emotion breakdown
   */
  async getEmotionBreakdown(dateRange?: DateRange) {
    const where: Prisma.SentimentAnalysisWhereInput = {};

    if (dateRange?.startDate || dateRange?.endDate) {
      const createdAtFilter: any = {};
      if (dateRange.startDate) {
        createdAtFilter.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        createdAtFilter.lte = dateRange.endDate;
      }
      where.feedback = {
        createdAt: createdAtFilter,
      };
    }

    const emotions = await prisma.sentimentAnalysis.groupBy({
      by: ["primaryEmotion"],
      where: {
        ...where,
        primaryEmotion: { not: null },
      },
      _count: { primaryEmotion: true },
    });

    const total = emotions.reduce((sum, e) => sum + e._count.primaryEmotion, 0);

    return emotions.map((emotion) => ({
      emotion: emotion.primaryEmotion as Emotion,
      count: emotion._count.primaryEmotion,
      percentage: total > 0 ? (emotion._count.primaryEmotion / total) * 100 : 0,
    }));
  }

  /**
   * Get customer segment analysis
   */
  async getCustomerSegmentAnalysis(dateRange?: DateRange) {
    const where: Prisma.FeedbackWhereInput = {
      customerSegment: { not: null },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    const segments = await prisma.feedback.groupBy({
      by: ["customerSegment"],
      where,
      _count: { id: true },
      _avg: { rating: true },
    });

    return segments
      .filter((s) => s.customerSegment)
      .map((segment) => ({
        segment: segment.customerSegment!,
        count: segment._count.id,
        averageRating: segment._avg.rating || 0,
      }));
  }

  /**
   * Get journey stage analysis
   */
  async getJourneyStageAnalysis(dateRange?: DateRange) {
    const where: Prisma.FeedbackWhereInput = {
      journeyStage: { not: null },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = dateRange.startDate;
      if (dateRange.endDate) where.createdAt.lte = dateRange.endDate;
    }

    const stages = await prisma.feedback.groupBy({
      by: ["journeyStage"],
      where,
      _count: { id: true },
      _avg: { rating: true },
    });

    return stages
      .filter((s) => s.journeyStage)
      .map((stage) => ({
        stage: stage.journeyStage!,
        count: stage._count.id,
        averageRating: stage._avg.rating || 0,
      }));
  }

  /**
   * Group feedbacks by time interval
   */
  private groupByInterval(feedbacks: any[], interval: "hour" | "day" | "week") {
    const grouped = new Map<string, Map<Sentiment, number>>();

    for (const feedback of feedbacks) {
      if (!feedback.sentimentAnalysis) continue;

      const date = new Date(feedback.createdAt);
      let key: string;

      if (interval === "hour") {
        date.setMinutes(0, 0, 0);
        key = date.toISOString();
      } else if (interval === "day") {
        date.setHours(0, 0, 0, 0);
        key = date.toISOString().split("T")[0];
      } else {
        // Week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        key = weekStart.toISOString().split("T")[0];
      }

      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }

      const sentimentMap = grouped.get(key)!;
      const sentiment = feedback.sentimentAnalysis.sentiment;
      sentimentMap.set(sentiment, (sentimentMap.get(sentiment) || 0) + 1);
    }

    // Convert to array format
    return Array.from(grouped.entries()).map(([date, sentiments]) => ({
      date,
      sentiments: Object.fromEntries(sentiments),
    }));
  }
}

export const dashboardService = new DashboardService();
