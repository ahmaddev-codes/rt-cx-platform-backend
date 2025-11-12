import { PrismaClient, FeedbackChannel, Sentiment, Emotion } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.apiUsage.deleteMany();
  await prisma.metricsSnapshot.deleteMany();
  await prisma.dashboard.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.sentimentAnalysis.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@rtcx.com",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@rtcx.com",
      password: hashedPassword,
      name: "Manager User",
      role: "MANAGER",
    },
  });

  const agent = await prisma.user.create({
    data: {
      email: "agent@rtcx.com",
      password: hashedPassword,
      name: "Agent User",
      role: "AGENT",
    },
  });

  console.log("✅ Created users");

  // Create topics
  const topics = await Promise.all([
    prisma.topic.create({
      data: { name: "Login Issues", category: "technical" },
    }),
    prisma.topic.create({
      data: { name: "Slow Transfer", category: "product" },
    }),
    prisma.topic.create({
      data: { name: "Great Service", category: "service" },
    }),
    prisma.topic.create({
      data: { name: "App Crashes", category: "technical" },
    }),
    prisma.topic.create({ data: { name: "High Fees", category: "pricing" } }),
    prisma.topic.create({ data: { name: "Easy to Use", category: "product" } }),
    prisma.topic.create({
      data: { name: "Long Wait Times", category: "service" },
    }),
  ]);

  console.log("✅ Created topics");

  // Create sample feedback with sentiment analysis
  const feedbackData: Array<{
    channel: FeedbackChannel;
    rating: number;
    comment: string;
    sentiment: Sentiment;
    sentimentScore: number;
    emotion: string;
    topics: string[];
  }> = [
    {
      channel: "IN_APP_SURVEY",
      rating: 5,
      comment: "The new transfer feature is amazing! So fast and easy to use.",
      sentiment: "VERY_POSITIVE",
      sentimentScore: 0.9,
      emotion: "JOY",
      topics: ["Easy to Use"],
    },
    {
      channel: "CHATBOT",
      rating: 2,
      comment:
        "I could not log in for 30 minutes. Very frustrating experience.",
      sentiment: "NEGATIVE",
      sentimentScore: -0.7,
      emotion: "FRUSTRATION",
      topics: ["Login Issues"],
    },
    {
      channel: "VOICE_CALL",
      rating: 4,
      comment: "Customer service was helpful, but I waited too long.",
      sentiment: "POSITIVE",
      sentimentScore: 0.4,
      emotion: "SATISFACTION",
      topics: ["Great Service", "Long Wait Times"],
    },
    {
      channel: "IN_APP_SURVEY",
      rating: 1,
      comment: "App keeps crashing when I try to view my statements.",
      sentiment: "VERY_NEGATIVE",
      sentimentScore: -0.9,
      emotion: "ANGER",
      topics: ["App Crashes"],
    },
    {
      channel: "SOCIAL_MEDIA",
      rating: 3,
      comment: "Transfer was slow but eventually worked. Average experience.",
      sentiment: "NEUTRAL",
      sentimentScore: 0.0,
      emotion: "NEUTRAL",
      topics: ["Slow Transfer"],
    },
  ];

  for (const data of feedbackData) {
    interface TopicConnect {
      id: string;
    }

    interface FeedbackCreateInput {
      userId: string;
      channel: FeedbackChannel;
      rating: number;
      comment: string;
      customerSegment: string;
      journeyStage: string;
      processed: boolean;
      topics: { connect: TopicConnect[] };
    }

    const connectItems: TopicConnect[] = topics
      .filter((t: { id: string; name: string }) => data.topics.includes(t.name))
      .map((t: { id: string }) => ({ id: t.id }));

    const feedbackPayload: FeedbackCreateInput = {
      userId: agent.id,
      channel: data.channel,
      rating: data.rating,
      comment: data.comment,
      customerSegment: "Regular",
      journeyStage: "Transaction",
      processed: true,
      topics: {
      connect: connectItems,
      },
    };

    const feedback: { id: string } = await prisma.feedback.create({
      data: feedbackPayload,
    });

    await prisma.sentimentAnalysis.create({
      data: {
        feedbackId: feedback.id,
        sentiment: data.sentiment,
        sentimentScore: data.sentimentScore,
        confidence: 0.85,
        emotions: { [data.emotion.toLowerCase()]: 0.8 },
        primaryEmotion: data.emotion as Emotion,
        detectedLanguage: "en",
        wordCount: data.comment.split(" ").length,
        keyPhrases: [],
      },
    });
  }

  console.log("✅ Created feedback with sentiment analysis");

  // Create sample alerts
  await prisma.alert.create({
    data: {
      type: "SENTIMENT_SPIKE",
      severity: "HIGH",
      title: "Negative Sentiment Spike Detected",
      message:
        "Negative sentiment increased by 40% in the last hour on IN_APP_SURVEY channel.",
      assignedToId: manager.id,
      status: "OPEN",
      threshold: { threshold: 0.4, window: "1h" },
      dataSnapshot: { negativeCount: 15, totalCount: 30 },
    },
  });

  await prisma.alert.create({
    data: {
      type: "TRENDING_TOPIC",
      severity: "MEDIUM",
      title: "New Trending Topic: Login Issues",
      message: 'Topic "Login Issues" mentioned 25 times in the last 2 hours.',
      assignedToId: manager.id,
      status: "IN_PROGRESS",
      threshold: { mentionThreshold: 20 },
      dataSnapshot: { topicCount: 25 },
    },
  });

  console.log("✅ Created alerts");

  // Create sample dashboard
  await prisma.dashboard.create({
    data: {
      name: "Executive Overview",
      description: "High-level customer satisfaction metrics",
      widgets: [
        { type: "sentiment-meter", position: { x: 0, y: 0 }, size: "large" },
        { type: "trending-topics", position: { x: 1, y: 0 }, size: "medium" },
        { type: "channel-breakdown", position: { x: 0, y: 1 }, size: "medium" },
      ],
      filters: { dateRange: "7d" },
      isPublic: true,
      createdBy: admin.id,
    },
  });

  console.log("✅ Created dashboard");

  // Create metrics snapshot
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.metricsSnapshot.create({
    data: {
      date: today,
      totalFeedback: 150,
      averageRating: 3.8,
      sentimentBreakdown: {
        very_positive: 25,
        positive: 45,
        neutral: 35,
        negative: 30,
        very_negative: 15,
      },
      topEmotions: [
        { emotion: "satisfaction", count: 50 },
        { emotion: "frustration", count: 35 },
        { emotion: "joy", count: 30 },
      ],
      topTopics: [
        { topic: "Login Issues", count: 25 },
        { topic: "Great Service", count: 20 },
        { topic: "Slow Transfer", count: 15 },
      ],
    },
  });

  console.log("✅ Created metrics snapshot");

  console.log("🎉 Seeding completed successfully!");
  console.log("\n📊 Created:");
  console.log("  - 3 users (admin, manager, agent)");
  console.log("  - 7 topics");
  console.log("  - 5 feedback entries with sentiment analysis");
  console.log("  - 2 alerts");
  console.log("  - 1 dashboard");
  console.log("  - 1 metrics snapshot");
  console.log("\n🔐 Login credentials:");
  console.log("  Admin: admin@rtcx.com / Password123!");
  console.log("  Manager: manager@rtcx.com / Password123!");
  console.log("  Agent: agent@rtcx.com / Password123!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
