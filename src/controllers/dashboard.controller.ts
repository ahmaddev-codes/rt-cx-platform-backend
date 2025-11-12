import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { ApiResponse } from "../types/api.types";
import { FeedbackChannel } from "@prisma/client";

/**
 * Helper function to parse date range from query params
 */
function parseDateRange(query: any) {
  if (query.range) {
    const now = new Date();
    const ranges: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };

    const ms = ranges[query.range];
    if (ms) {
      return {
        startDate: new Date(now.getTime() - ms),
        endDate: now,
      };
    }
  }

  return {
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  };
}

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get overall dashboard statistics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
export const getOverallStats = asyncHandler(
  async (req: Request, res: Response) => {
    const dateRange = parseDateRange(req.query);

    const stats = await dashboardService.getOverallStats(dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: stats,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/trends:
 *   get:
 *     summary: Get sentiment trends over time
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sentiment trends retrieved successfully
 */
export const getSentimentTrends = asyncHandler(
  async (req: Request, res: Response) => {
    const interval = (req.query.interval as "hour" | "day" | "week") || "day";
    const dateRange = parseDateRange(req.query);
    const channel = req.query.channel as FeedbackChannel | undefined;

    const trends = await dashboardService.getSentimentTrends(
      interval,
      dateRange,
      channel
    );

    const response: ApiResponse = {
      status: "ok",
      data: trends,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/channels:
 *   get:
 *     summary: Get channel performance metrics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Channel performance retrieved successfully
 */
export const getChannelPerformance = asyncHandler(
  async (req: Request, res: Response) => {
    const dateRange = parseDateRange(req.query);

    const performance = await dashboardService.getChannelPerformance(dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: performance,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/topics:
 *   get:
 *     summary: Get trending topics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Trending topics retrieved successfully
 */
export const getTrendingTopics = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const dateRange = parseDateRange(req.query);

    const topics = await dashboardService.getTrendingTopics(limit, dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: topics,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/emotions:
 *   get:
 *     summary: Get emotion breakdown
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Emotion breakdown retrieved successfully
 */
export const getEmotionBreakdown = asyncHandler(
  async (req: Request, res: Response) => {
    const dateRange = parseDateRange(req.query);

    const emotions = await dashboardService.getEmotionBreakdown(dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: emotions,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/segments:
 *   get:
 *     summary: Get customer segment analysis
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Customer segment analysis retrieved successfully
 */
export const getCustomerSegments = asyncHandler(
  async (req: Request, res: Response) => {
    const dateRange = parseDateRange(req.query);

    const segments =
      await dashboardService.getCustomerSegmentAnalysis(dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: segments,
    };

    res.json(response);
  }
);

/**
 * @swagger
 * /api/v1/dashboard/journey:
 *   get:
 *     summary: Get journey stage analysis
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Journey stage analysis retrieved successfully
 */
export const getJourneyStages = asyncHandler(
  async (req: Request, res: Response) => {
    const dateRange = parseDateRange(req.query);

    const stages = await dashboardService.getJourneyStageAnalysis(dateRange);

    const response: ApiResponse = {
      status: "ok",
      data: stages,
    };

    res.json(response);
  }
);
