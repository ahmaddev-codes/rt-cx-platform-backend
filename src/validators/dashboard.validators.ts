import { z } from "zod";

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  range: z.enum(["1h", "24h", "7d", "30d", "90d"]).optional(),
});

export const sentimentTrendsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(["hour", "day", "week"]).optional().default("day"),
  channel: z.string().optional(),
});

export const topicsFilterSchema = z.object({
  limit: z.string().optional().default("10"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DateRangeDTO = z.infer<typeof dateRangeSchema>;
export type SentimentTrendsDTO = z.infer<typeof sentimentTrendsSchema>;
export type TopicsFilterDTO = z.infer<typeof topicsFilterSchema>;
