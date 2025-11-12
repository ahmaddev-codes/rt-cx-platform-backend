import { Request, Response } from "express";
import { alertService } from "../services/alert.service";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { AlertType, AlertSeverity, AlertStatus } from "@prisma/client";

/**
 * @route GET /api/v1/alerts
 * @desc Get alerts with filters and pagination
 * @access Private (MANAGER+)
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const {
    type,
    severity,
    status,
    assignedToId,
    startDate,
    endDate,
    page,
    limit,
  } = req.query;

  const filters = {
    type: type as AlertType | undefined,
    severity: severity as AlertSeverity | undefined,
    status: status as AlertStatus | undefined,
    assignedToId: assignedToId as string | undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  };

  const options = {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  };

  const result = await alertService.getAlerts(filters, options);

  res.json({
    success: true,
    data: result.alerts,
    pagination: result.pagination,
  });
});

/**
 * @route POST /api/v1/alerts
 * @desc Create a new alert
 * @access Private (ADMIN only)
 */
export const createAlert = asyncHandler(async (req: Request, res: Response) => {
  const { type, severity, title, message, threshold, dataSnapshot } = req.body;

  const alert = await alertService.createAlert({
    type,
    severity,
    title,
    message,
    threshold,
    dataSnapshot,
  });

  res.status(201).json({
    success: true,
    message: "Alert created successfully",
    data: alert,
  });
});

/**
 * @route GET /api/v1/alerts/stats
 * @desc Get alert statistics
 * @access Private (MANAGER+)
 */
export const getAlertStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const stats = await alertService.getAlertStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * @route GET /api/v1/alerts/:id
 * @desc Get single alert by ID
 * @access Private (MANAGER+)
 */
export const getAlertById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const alert = await alertService.getAlertById(id);

    res.json({
      success: true,
      data: alert,
    });
  }
);

/**
 * @route PATCH /api/v1/alerts/:id
 * @desc Update alert status or read state
 * @access Private (MANAGER+)
 */
export const updateAlert = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const alert = await alertService.updateAlert(id, { status });

  res.json({
    success: true,
    message: "Alert updated successfully",
    data: alert,
  });
});

/**
 * @route POST /api/v1/alerts/:id/assign
 * @desc Assign alert to a user
 * @access Private (MANAGER+)
 */
export const assignAlert = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const alert = await alertService.assignAlert(id, userId);

  res.json({
    success: true,
    message: "Alert assigned successfully",
    data: alert,
  });
});

/**
 * @route POST /api/v1/alerts/:id/resolve
 * @desc Resolve an alert
 * @access Private (MANAGER+)
 */
export const resolveAlert = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolution } = req.body;
    const userId = req.user!.userId;

    const alert = await alertService.resolveAlert(id, userId, resolution);

    res.json({
      success: true,
      message: "Alert resolved successfully",
      data: alert,
    });
  }
);
