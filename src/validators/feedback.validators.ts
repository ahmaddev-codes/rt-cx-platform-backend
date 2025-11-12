import { z } from "zod";
import { FeedbackChannel } from "@prisma/client";

export const createFeedbackSchema = z.object({
  channel: z.nativeEnum(FeedbackChannel),
  source: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(5000).optional(),
  metadata: z.record(z.any()).optional(),
  customerSegment: z.string().optional(),
  journeyStage: z.string().optional(),
});

export const bulkFeedbackSchema = z.object({
  feedbacks: z.array(createFeedbackSchema).min(1).max(100),
});

export const feedbackFilterSchema = z.object({
  channel: z.nativeEnum(FeedbackChannel).optional(),
  sentiment: z
    .enum(["VERY_POSITIVE", "POSITIVE", "NEUTRAL", "NEGATIVE", "VERY_NEGATIVE"])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  customerSegment: z.string().optional(),
  processed: z.enum(["true", "false"]).optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  sort: z.string().optional(),
});

export type CreateFeedbackDTO = z.infer<typeof createFeedbackSchema>;
export type BulkFeedbackDTO = z.infer<typeof bulkFeedbackSchema>;
export type FeedbackFilterDTO = z.infer<typeof feedbackFilterSchema>;
