export const CONSTANTS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Sentiment thresholds
  SENTIMENT_THRESHOLDS: {
    VERY_POSITIVE: 0.6,
    POSITIVE: 0.2,
    NEUTRAL: -0.2,
    NEGATIVE: -0.6,
  },

  // Alert thresholds
  ALERT_THRESHOLDS: {
    SENTIMENT_SPIKE_PERCENT: 0.3, // 30% increase triggers alert
    HIGH_VOLUME_NEGATIVE_COUNT: 10, // 10+ negative feedback in 1 hour
    TRENDING_TOPIC_MENTIONS: 15, // 15+ mentions in 2 hours
  },

  // Cache TTL (seconds)
  CACHE_TTL: {
    DASHBOARD_STATS: 60, // 1 minute
    USER_PROFILE: 300, // 5 minutes
    METRICS: 120, // 2 minutes
  },

  // Background job priorities
  JOB_PRIORITY: {
    CRITICAL: 1,
    HIGH: 5,
    NORMAL: 10,
    LOW: 15,
  },

  // Supported languages for NLP
  SUPPORTED_LANGUAGES: ["en", "es", "fr", "de", "pt"],

  // Feedback rating scale
  RATING_MIN: 1,
  RATING_MAX: 5,
};
