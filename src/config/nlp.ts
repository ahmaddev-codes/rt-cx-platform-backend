import { z } from "zod";

/**
 * NLP Service Configuration
 */

export const NLP_CONFIG = {
  // Hugging Face API
  HUGGINGFACE: {
    BASE_URL: "https://api-inference.huggingface.co/models",
    API_KEY: process.env.HUGGINGFACE_API_KEY || "",
    TIMEOUT: 30000, // 30 seconds
  },

  // Models
  MODELS: {
    SENTIMENT: process.env.SENTIMENT_MODEL || "distilbert-base-uncased-finetuned-sst-2-english",
    EMOTION: process.env.EMOTION_MODEL || "j-hartmann/emotion-english-distilroberta-base",
  },

  // Processing Configuration
  PROCESSING: {
    BATCH_SIZE: parseInt(process.env.SENTIMENT_BATCH_SIZE || "10"),
    RETRY_ATTEMPTS: parseInt(process.env.SENTIMENT_RETRY_ATTEMPTS || "3"),
    RETRY_DELAY: parseInt(process.env.SENTIMENT_RETRY_DELAY || "2000"),
    MODEL_WARMUP_DELAY: parseInt(process.env.MODEL_WARMUP_DELAY || "20000"),
  },

  // Sentiment Score Mapping
  SENTIMENT_THRESHOLDS: {
    VERY_POSITIVE: 0.8,   // > 0.8 = VERY_POSITIVE
    POSITIVE: 0.6,        // 0.6-0.8 = POSITIVE
    NEUTRAL_MIN: 0.4,     // 0.4-0.6 = NEUTRAL
    NEUTRAL_MAX: 0.6,
    NEGATIVE: 0.6,        // 0.6-0.8 = NEGATIVE (for negative label)
    VERY_NEGATIVE: 0.8,   // > 0.8 = VERY_NEGATIVE (for negative label)
  },

  // Emotion Mapping
  EMOTION_MAPPING: {
    joy: "JOY",
    satisfaction: "SATISFACTION",
    neutral: "NEUTRAL",
    sadness: "SADNESS",
    anger: "ANGER",
    fear: "FRUSTRATION",
    surprise: "SURPRISE",
    disgust: "FRUSTRATION",
    frustration: "FRUSTRATION",
    confusion: "CONFUSION",
  } as const,

  // Alert Thresholds
  ALERT_THRESHOLDS: {
    SENTIMENT_SPIKE: {
      NEGATIVE_COUNT_1H: 10,      // 10 negative feedback in 1 hour
      NEGATIVE_COUNT_24H: 50,     // 50 negative feedback in 24 hours
      NEGATIVE_RATIO_1H: 0.7,     // 70% negative in 1 hour
    },
    HIGH_VOLUME_NEGATIVE: {
      COUNT_1H: 20,               // 20+ negative feedback in 1 hour
      SEVERITY: "HIGH" as const,
    },
  },
} as const;

// Validate configuration
export function validateNLPConfig() {
  const schema = z.object({
    HUGGINGFACE_API_KEY: z.string().min(1, "HUGGINGFACE_API_KEY is required"),
  });

  try {
    schema.parse({
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `NLP Configuration Error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
}

// Export types
export type EmotionLabel = keyof typeof NLP_CONFIG.EMOTION_MAPPING;
export type MappedEmotion = (typeof NLP_CONFIG.EMOTION_MAPPING)[EmotionLabel];
