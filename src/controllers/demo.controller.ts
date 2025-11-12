import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { FeedbackChannel } from "@prisma/client";
import { sentimentQueue } from "../workers/index";

// Demo organizations/banks
const DEMO_BANKS = [
  { id: "bank-a", name: "FirstBank Demo" },
  { id: "bank-b", name: "TechBank Demo" },
  { id: "bank-c", name: "GlobalBank Demo" },
];

// Realistic feedback templates
const FEEDBACK_TEMPLATES = {
  POSITIVE: [
    {
      comment: "Great service! The mobile app is super fast and easy to use.",
      rating: 5,
    },
    {
      comment: "I love the new features. Customer support was very helpful.",
      rating: 5,
    },
    {
      comment: "Quick response time and resolved my issue immediately.",
      rating: 4,
    },
    { comment: "The interface is clean and intuitive. Well done!", rating: 5 },
    { comment: "Smooth transaction experience, no issues at all.", rating: 4 },
  ],
  NEUTRAL: [
    {
      comment: "Service is okay. Could be better but gets the job done.",
      rating: 3,
    },
    {
      comment: "Average experience. Nothing special but nothing terrible.",
      rating: 3,
    },
    { comment: "It works fine. Some features could be improved.", rating: 3 },
    { comment: "Decent service overall. Room for improvement.", rating: 3 },
  ],
  NEGATIVE: [
    {
      comment: "ATM ate my card and I couldn't reach anyone for help!",
      rating: 1,
    },
    {
      comment: "Terrible experience. App keeps crashing during transactions.",
      rating: 1,
    },
    {
      comment: "Very frustrated with the slow customer service response.",
      rating: 2,
    },
    { comment: "This is unacceptable. System was down for hours.", rating: 1 },
    {
      comment: "Disappointed with the lack of support. Been waiting for days.",
      rating: 2,
    },
    { comment: "Horrible mobile app performance. Keeps freezing.", rating: 1 },
    {
      comment: "Poor service quality. Staff was rude and unhelpful.",
      rating: 2,
    },
  ],
};

const CHANNELS: FeedbackChannel[] = [
  "IN_APP_SURVEY",
  "CHATBOT",
  "WEB_FORM",
  "EMAIL",
  "SOCIAL_MEDIA",
  "VOICE_CALL",
];

const CUSTOMER_SEGMENTS = ["Regular", "VIP", "New", "Premium"];
const JOURNEY_STAGES = [
  "Onboarding",
  "Transaction",
  "Support",
  "Complaint",
  "Feedback",
];

/**
 * Seed demo data with realistic feedback
 */
export const seedDemo = async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.body.count as string) || 50;
    const organizationId = req.body.organizationId || DEMO_BANKS[0].id;

    logger.info(`Seeding ${count} demo feedback items for ${organizationId}`);

    const createdFeedback = [];

    // Create mix of positive, neutral, and negative feedback
    const positiveCount = Math.floor(count * 0.4); // 40%
    const neutralCount = Math.floor(count * 0.3); // 30%
    const negativeCount = count - positiveCount - neutralCount; // 30%

    // Generate positive feedback
    for (let i = 0; i < positiveCount; i++) {
      const template =
        FEEDBACK_TEMPLATES.POSITIVE[
          Math.floor(Math.random() * FEEDBACK_TEMPLATES.POSITIVE.length)
        ];
      const feedback = await createDemoFeedback(template, organizationId);
      createdFeedback.push(feedback);
    }

    // Generate neutral feedback
    for (let i = 0; i < neutralCount; i++) {
      const template =
        FEEDBACK_TEMPLATES.NEUTRAL[
          Math.floor(Math.random() * FEEDBACK_TEMPLATES.NEUTRAL.length)
        ];
      const feedback = await createDemoFeedback(template, organizationId);
      createdFeedback.push(feedback);
    }

    // Generate negative feedback
    for (let i = 0; i < negativeCount; i++) {
      const template =
        FEEDBACK_TEMPLATES.NEGATIVE[
          Math.floor(Math.random() * FEEDBACK_TEMPLATES.NEGATIVE.length)
        ];
      const feedback = await createDemoFeedback(template, organizationId);
      createdFeedback.push(feedback);
    }

    logger.info(
      `Successfully seeded ${createdFeedback.length} demo feedback items`
    );

    res.json({
      success: true,
      message: `Created ${createdFeedback.length} demo feedback items`,
      data: {
        total: createdFeedback.length,
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
        organizationId,
      },
    });
  } catch (error) {
    logger.error("Failed to seed demo data", { error });
    res.status(500).json({
      success: false,
      message: "Failed to seed demo data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Reset all demo data
 */
export const resetDemo = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;

    logger.info("Resetting demo data", { organizationId });

    // Delete sentiment analysis first (foreign key constraint)
    const deletedSentiment = await prisma.sentimentAnalysis.deleteMany({
      where: organizationId
        ? {
            feedback: {
              metadata: {
                path: ["organizationId"],
                equals: organizationId,
              },
            },
          }
        : {},
    });

    // Delete feedback
    const deletedFeedback = await prisma.feedback.deleteMany({
      where: organizationId
        ? {
            metadata: {
              path: ["organizationId"],
              equals: organizationId,
            },
          }
        : {},
    });

    // Delete alerts
    const deletedAlerts = await prisma.alert.deleteMany({
      where: organizationId
        ? {
            dataSnapshot: {
              path: ["organizationId"],
              equals: organizationId,
            },
          }
        : {},
    });

    logger.info("Demo data reset complete", {
      deletedFeedback: deletedFeedback.count,
      deletedSentiment: deletedSentiment.count,
      deletedAlerts: deletedAlerts.count,
    });

    res.json({
      success: true,
      message: "Demo data reset successfully",
      data: {
        deletedFeedback: deletedFeedback.count,
        deletedSentiment: deletedSentiment.count,
        deletedAlerts: deletedAlerts.count,
        organizationId: organizationId || "all",
      },
    });
  } catch (error) {
    logger.error("Failed to reset demo data", { error });
    res.status(500).json({
      success: false,
      message: "Failed to reset demo data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get demo statistics
 */
export const getDemoStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;

    const whereClause = organizationId
      ? {
          metadata: {
            path: ["organizationId"],
            equals: organizationId,
          },
        }
      : {};

    const [
      totalFeedback,
      feedbackWithSentiment,
      totalAlerts,
      sentimentBreakdown,
    ] = await Promise.all([
      prisma.feedback.count({ where: whereClause }),
      prisma.feedback.count({
        where: {
          ...whereClause,
          sentimentAnalysis: { isNot: null },
        },
      }),
      prisma.alert.count(),
      prisma.sentimentAnalysis.groupBy({
        by: ["sentiment"],
        _count: { id: true },
        where: organizationId
          ? {
              feedback: {
                metadata: {
                  path: ["organizationId"],
                  equals: organizationId,
                },
              },
            }
          : {},
      }),
    ]);

    const avgRating = await prisma.feedback.aggregate({
      where: whereClause,
      _avg: { rating: true },
    });

    const sentimentStats = sentimentBreakdown.reduce(
      (acc, item) => {
        acc[item.sentiment] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      success: true,
      data: {
        totalFeedback,
        feedbackWithSentiment,
        pendingAnalysis: totalFeedback - feedbackWithSentiment,
        totalAlerts,
        averageRating: avgRating._avg.rating || 0,
        sentimentBreakdown: sentimentStats,
        organizationId: organizationId || "all",
        demoOrganizations: DEMO_BANKS,
      },
    });
  } catch (error) {
    logger.error("Failed to get demo stats", { error });
    res.status(500).json({
      success: false,
      message: "Failed to get demo stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Trigger manual alert for demo purposes
 */
export const triggerDemoAlert = async (req: Request, res: Response) => {
  try {
    const {
      type = "SENTIMENT_SPIKE",
      severity = "HIGH",
      organizationId,
    } = req.body;

    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        title: `Demo Alert: ${type}`,
        message: `This is a demo alert triggered manually for testing purposes.`,
        status: "OPEN",
        dataSnapshot: {
          organizationId: organizationId || "demo",
          demo: true,
          triggeredAt: new Date().toISOString(),
        },
      },
    });

    // Broadcast via WebSocket
    const { wsService } = await import("../services/websocket.service");
    wsService.broadcastNewAlert(alert);

    logger.info("Demo alert triggered", { alertId: alert.id, type });

    res.json({
      success: true,
      message: "Demo alert triggered successfully",
      data: alert,
    });
  } catch (error) {
    logger.error("Failed to trigger demo alert", { error });
    res.status(500).json({
      success: false,
      message: "Failed to trigger demo alert",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Helper function to create demo feedback
 */
async function createDemoFeedback(
  template: { comment: string; rating: number },
  organizationId: string
) {
  const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const customerSegment =
    CUSTOMER_SEGMENTS[Math.floor(Math.random() * CUSTOMER_SEGMENTS.length)];
  const journeyStage =
    JOURNEY_STAGES[Math.floor(Math.random() * JOURNEY_STAGES.length)];

  const feedback = await prisma.feedback.create({
    data: {
      channel,
      rating: template.rating,
      comment: template.comment,
      customerSegment,
      journeyStage,
      source: `demo-${channel.toLowerCase()}`,
      processed: false,
      metadata: {
        organizationId,
        demo: true,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // Queue for sentiment analysis
  if (feedback.comment) {
    try {
      const priority = customerSegment === "VIP" ? 1 : 5;
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
        `Failed to queue sentiment analysis for demo feedback: ${feedback.id}`,
        {
          error,
        }
      );
    }
  }

  return feedback;
}
