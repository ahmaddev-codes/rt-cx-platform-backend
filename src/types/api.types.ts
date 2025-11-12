// Shared TypeScript types and interfaces

export interface ApiResponse<T = unknown> {
  status: "ok" | "error";
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Role = "ADMIN" | "MANAGER" | "AGENT" | "API_USER";

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

export interface UpdateUserDTO {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

// Auth types
export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  role: Role;
}

// Feedback types
export type FeedbackChannel =
  | "IN_APP_SURVEY"
  | "CHATBOT"
  | "VOICE_CALL"
  | "SOCIAL_MEDIA"
  | "EMAIL"
  | "WEB_FORM"
  | "SMS";

export interface Feedback {
  id: string;
  userId: string | null;
  channel: FeedbackChannel;
  source: string | null;
  rating: number | null;
  comment: string | null;
  metadata: Record<string, any> | null;
  customerSegment: string | null;
  journeyStage: string | null;
  processed: boolean;
  createdAt: string;
  updatedAt: string;
  sentimentAnalysis?: SentimentAnalysis;
  topics?: Topic[];
}

export interface CreateFeedbackDTO {
  channel: FeedbackChannel;
  source?: string;
  rating?: number;
  comment?: string;
  metadata?: Record<string, any>;
  customerSegment?: string;
  journeyStage?: string;
}

export interface FeedbackFilter {
  channel?: FeedbackChannel;
  sentiment?: Sentiment;
  startDate?: string;
  endDate?: string;
  customerSegment?: string;
  processed?: boolean;
}

// Sentiment types
export type Sentiment =
  | "VERY_POSITIVE"
  | "POSITIVE"
  | "NEUTRAL"
  | "NEGATIVE"
  | "VERY_NEGATIVE";
export type Emotion =
  | "JOY"
  | "SATISFACTION"
  | "NEUTRAL"
  | "FRUSTRATION"
  | "ANGER"
  | "SADNESS"
  | "CONFUSION"
  | "SURPRISE";

export interface SentimentAnalysis {
  id: string;
  feedbackId: string;
  sentiment: Sentiment;
  sentimentScore: number;
  confidence: number;
  emotions: Record<string, number>;
  primaryEmotion: Emotion | null;
  detectedLanguage: string | null;
  wordCount: number | null;
  keyPhrases: string[];
  analyzedAt: string;
}

// Topic types
export interface Topic {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicDTO {
  name: string;
  description?: string;
  category?: string;
}

// Alert types
export type AlertType =
  | "SENTIMENT_SPIKE"
  | "HIGH_VOLUME_NEGATIVE"
  | "TRENDING_TOPIC"
  | "CHANNEL_PERFORMANCE"
  | "CUSTOMER_CHURN_RISK"
  | "SYSTEM_ANOMALY";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  threshold: Record<string, any> | null;
  dataSnapshot: Record<string, any> | null;
  assignedToId: string | null;
  status: AlertStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertDTO {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  assignedToId?: string;
  threshold?: Record<string, any>;
  dataSnapshot?: Record<string, any>;
}

export interface UpdateAlertDTO {
  status?: AlertStatus;
  assignedToId?: string;
  resolution?: string;
}

// Dashboard types
export interface DashboardStats {
  totalFeedback: number;
  averageRating: number;
  sentimentBreakdown: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
  trendingTopics: Array<{ topic: string; count: number }>;
  channelPerformance: Array<{
    channel: FeedbackChannel;
    averageRating: number;
    count: number;
  }>;
  recentAlerts: Alert[];
}

export interface SentimentTrend {
  date: string;
  sentiment: Sentiment;
  count: number;
}

export interface EmotionBreakdown {
  emotion: Emotion;
  count: number;
  percentage: number;
}

// WebSocket event types
export interface WebSocketEvent {
  type: "feedback" | "alert" | "metric_update";
  data: any;
}

export interface NewFeedbackEvent extends WebSocketEvent {
  type: "feedback";
  data: Feedback;
}

export interface NewAlertEvent extends WebSocketEvent {
  type: "alert";
  data: Alert;
}

export interface MetricUpdateEvent extends WebSocketEvent {
  type: "metric_update";
  data: DashboardStats;
}
