import { Prisma, AlertType, AlertSeverity, AlertStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler.middleware";
import { wsService } from "./websocket.service";

interface CreateAlertInput {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  threshold?: Prisma.InputJsonValue;
  dataSnapshot?: Prisma.InputJsonValue;
}

interface AlertFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  assignedToId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class AlertService {
  /**
   * Create a new alert
   */
  async createAlert(input: CreateAlertInput) {
    const alert = await prisma.alert.create({
      data: {
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        threshold: input.threshold || {},
        dataSnapshot: input.dataSnapshot || {},
        status: AlertStatus.OPEN,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Broadcast new alert via WebSocket
    wsService.broadcastNewAlert(alert);

    return alert;
  }

  /**
   * Get alerts with filters and pagination
   */
  async getAlerts(filters: AlertFilters, options: PaginationOptions = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { severity: "desc" }, // High severity first
          { createdAt: "desc" }, // Newest first
        ],
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string) {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!alert) {
      throw new AppError(404, "ALERT_NOT_FOUND", "Alert not found");
    }

    return alert;
  }

  /**
   * Update alert
   */
  async updateAlert(id: string, data: { status?: AlertStatus }) {
    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new AppError(404, "ALERT_NOT_FOUND", "Alert not found");
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Broadcast alert update via WebSocket
    wsService.broadcastAlertUpdate(updated);

    return updated;
  }

  /**
   * Assign alert to a user
   */
  async assignAlert(alertId: string, userId: string) {
    const [alert, user] = await Promise.all([
      prisma.alert.findUnique({ where: { id: alertId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!alert) {
      throw new AppError(404, "ALERT_NOT_FOUND", "Alert not found");
    }

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        assignedToId: userId,
        status: AlertStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Broadcast alert assignment via WebSocket
    wsService.broadcastAlertUpdate(updated);

    return updated;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string) {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new AppError(404, "ALERT_NOT_FOUND", "Alert not found");
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new AppError(
        400,
        "ALERT_ALREADY_RESOLVED",
        "Alert is already resolved"
      );
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedBy,
        resolvedAt: new Date(),
        resolution,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Broadcast alert resolution via WebSocket
    wsService.broadcastAlertUpdate(updated);

    return updated;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(filters?: { startDate?: Date; endDate?: Date }) {
    const where: Prisma.AlertWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [
      totalAlerts,
      byStatus,
      bySeverity,
      byType,
      assignedCount,
      unassignedCount,
    ] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
      prisma.alert.groupBy({
        by: ["severity"],
        where,
        _count: { id: true },
      }),
      prisma.alert.groupBy({
        by: ["type"],
        where,
        _count: { id: true },
      }),
      prisma.alert.count({
        where: {
          ...where,
          assignedToId: { not: null },
        },
      }),
      prisma.alert.count({
        where: {
          ...where,
          assignedToId: null,
        },
      }),
    ]);

    return {
      total: totalAlerts,
      assigned: assignedCount,
      unassigned: unassignedCount,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<AlertStatus, number>
      ),
      bySeverity: bySeverity.reduce(
        (acc, item) => {
          acc[item.severity] = item._count.id;
          return acc;
        },
        {} as Record<AlertSeverity, number>
      ),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        },
        {} as Record<AlertType, number>
      ),
    };
  }
}

export const alertService = new AlertService();
