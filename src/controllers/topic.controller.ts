import { Request, Response } from "express";
import { topicService } from "../services/topic.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";

/**
 * @route POST /api/v1/topics
 * @desc Create a new topic
 * @access Private (MANAGER+)
 */
export const createTopic = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category } = req.body;

  const topic = await topicService.createTopic({
    name,
    description,
    category,
  });

  res.status(201).json({
    success: true,
    message: "Topic created successfully",
    data: topic,
  });
});

/**
 * @route GET /api/v1/topics
 * @desc Get topics with filters and pagination
 * @access Private (MANAGER+)
 */
export const getTopics = asyncHandler(async (req: Request, res: Response) => {
  const { category, search, page, limit } = req.query;

  const filters = {
    category: category as string | undefined,
    search: search as string | undefined,
  };

  const options = {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  };

  const result = await topicService.getTopics(filters, options);

  res.json({
    success: true,
    data: result.topics,
    pagination: result.pagination,
  });
});

/**
 * @route GET /api/v1/topics/trending
 * @desc Get trending topics
 * @access Private (MANAGER+)
 */
export const getTrendingTopics = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, days } = req.query;

    const topics = await topicService.getTrendingTopics(
      limit ? parseInt(limit as string) : undefined,
      days ? parseInt(days as string) : undefined
    );

    res.json({
      success: true,
      data: topics,
    });
  }
);

/**
 * @route GET /api/v1/topics/:id
 * @desc Get topic by ID
 * @access Private (MANAGER+)
 */
export const getTopicById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const topic = await topicService.getTopicById(id);

    res.json({
      success: true,
      data: topic,
    });
  }
);

/**
 * @route GET /api/v1/topics/:id/stats
 * @desc Get topic statistics
 * @access Private (MANAGER+)
 */
export const getTopicStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const stats = await topicService.getTopicStats(id);

    res.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * @route PUT /api/v1/topics/:id
 * @desc Update topic
 * @access Private (MANAGER+)
 */
export const updateTopic = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, category } = req.body;

  const topic = await topicService.updateTopic(id, {
    name,
    description,
    category,
  });

  res.json({
    success: true,
    message: "Topic updated successfully",
    data: topic,
  });
});

/**
 * @route DELETE /api/v1/topics/:id
 * @desc Delete topic
 * @access Private (ADMIN only)
 */
export const deleteTopic = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await topicService.deleteTopic(id);

  res.json({
    success: true,
    ...result,
  });
});
