import { z } from "zod";
import { AlertType, AlertSeverity, AlertStatus } from "@prisma/client";

export const createAlertSchema = z.object({
  type: z.nativeEnum(AlertType),
  severity: z.nativeEnum(AlertSeverity),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  assignedToId: z.string().optional(),
  threshold: z.record(z.any()).optional(),
  dataSnapshot: z.record(z.any()).optional(),
});

export const updateAlertSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  assignedToId: z.string().optional(),
  resolution: z.string().max(5000).optional(),
});

export const alertFilterSchema = z.object({
  type: z.nativeEnum(AlertType).optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  status: z.nativeEnum(AlertStatus).optional(),
  assignedToId: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  sort: z.string().optional(),
});

export const assignAlertSchema = z.object({
  userId: z.string().min(1),
});

export const resolveAlertSchema = z.object({
  resolution: z.string().min(1).max(5000),
});

export type CreateAlertDTO = z.infer<typeof createAlertSchema>;
export type UpdateAlertDTO = z.infer<typeof updateAlertSchema>;
export type AlertFilterDTO = z.infer<typeof alertFilterSchema>;
export type AssignAlertDTO = z.infer<typeof assignAlertSchema>;
export type ResolveAlertDTO = z.infer<typeof resolveAlertSchema>;
