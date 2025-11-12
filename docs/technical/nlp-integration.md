# NLP Integration Strategy - RT-CX Platform

## Overview

The RT-CX Platform uses Natural Language Processing (NLP) to automatically analyze customer feedback and extract actionable insights. This document outlines our NLP integration strategy, implementation details, and migration path.

---

## Selected Solution: Hugging Face Inference API

### Why Hugging Face?

After evaluating multiple NLP providers, we selected Hugging Face Inference API for the following reasons:

1. **Cost-Effective**: Free tier provides 1,000 requests/day, perfect for MVP
2. **Quick Implementation**: REST API with simple JSON responses
3. **Production-Ready**: Used by thousands of companies in production
4. **No Vendor Lock-in**: All models are open-source and portable
5. **Easy Migration**: Same models can run locally when scaling
6. **Multiple Capabilities**: Sentiment, emotion, topic extraction from single provider

---

## Architecture

### High-Level Flow

```
Feedback Created
    ↓
Queue for Analysis (BullMQ)
    ↓
Sentiment Worker Processes
    ↓
Call Hugging Face API
    ↓
Store Results in Database
    ↓
Trigger Alerts (if needed)
    ↓
Broadcast via WebSocket
```

### Components

```
src/services/sentiment.service.ts     → Core NLP service
src/workers/sentiment.worker.ts       → Background processor
src/workers/index.ts                  → Queue initialization
src/config/nlp.ts                     → NLP configuration
```

---

## Selected Models

### 1. Sentiment Analysis

**Model**: `distilbert-base-uncased-finetuned-sst-2-english`

**Why this model:**

- Fast inference (< 100ms)
- High accuracy (94%+)
- Pre-trained on SST-2 dataset
- Lightweight (66M parameters)

**Output:**

```json
[
  { "label": "NEGATIVE", "score": 0.9998 },
  { "label": "POSITIVE", "score": 0.0002 }
]
```

**Mapping to our schema:**

- POSITIVE (score > 0.8) → VERY_POSITIVE
- POSITIVE (score 0.6-0.8) → POSITIVE
- POSITIVE/NEGATIVE (score 0.4-0.6) → NEUTRAL
- NEGATIVE (score 0.6-0.8) → NEGATIVE
- NEGATIVE (score > 0.8) → VERY_NEGATIVE

---

### 2. Emotion Detection

**Model**: `j-hartmann/emotion-english-distilroberta-base`

**Why this model:**

- Detects 7 emotions (joy, sadness, anger, fear, surprise, disgust, neutral)
- Trained on diverse datasets
- High accuracy for customer feedback
- Fast inference

**Output:**

```json
[
  { "label": "joy", "score": 0.89 },
  { "label": "surprise", "score": 0.05 },
  { "label": "neutral", "score": 0.03 },
  { "label": "sadness", "score": 0.02 },
  { "label": "anger", "score": 0.01 }
]
```

**Mapping to our schema:**

- joy → JOY
- sadness → SADNESS
- anger → ANGER
- fear → FRUSTRATION (closest match)
- surprise → SURPRISE
- disgust → FRUSTRATION (closest match)
- neutral → NEUTRAL

---

### 3. Key Phrase Extraction

**Method**: TF-IDF with custom stopwords (initially)

**Future Enhancement**: Use `facebook/bart-large-mnli` for zero-shot topic classification

---

## API Integration

### Authentication

```typescript
// Headers for all requests
{
  "Authorization": "Bearer hf_xxxxxxxxxxxxx",
  "Content-Type": "application/json"
}
```

### Rate Limits

- **Free Tier**: 1,000 requests/day
- **Pro Tier**: 30,000 requests/month ($9/month)
- **Enterprise**: Custom limits

### Error Handling

```typescript
// Model loading (503)
if (error.status === 503) {
  // Retry after model warm-up (20 seconds)
  await sleep(20000);
  return retry(request);
}

// Rate limit (429)
if (error.status === 429) {
  // Exponential backoff
  await sleep(retryCount * 2000);
  return retry(request);
}

// General errors
// Fall back to rule-based analysis
return fallbackAnalysis(text);
```

---

## Implementation Details

### 1. Environment Variables

```env
# Hugging Face Configuration
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co/models

# Model Names
SENTIMENT_MODEL=distilbert-base-uncased-finetuned-sst-2-english
EMOTION_MODEL=j-hartmann/emotion-english-distilroberta-base

# Processing Configuration
SENTIMENT_BATCH_SIZE=10
SENTIMENT_RETRY_ATTEMPTS=3
SENTIMENT_RETRY_DELAY=2000
MODEL_WARMUP_DELAY=20000
```

### 2. Database Schema (Already Exists)

```prisma
model SentimentAnalysis {
  id               String   @id @default(cuid())
  feedbackId       String   @unique

  sentiment        Sentiment
  sentimentScore   Float    // -1 to 1
  confidence       Float    // 0 to 1

  emotions         Json     // All emotion scores
  primaryEmotion   Emotion?

  detectedLanguage String?
  wordCount        Int?
  keyPhrases       String[]

  analyzedAt       DateTime @default(now())
  feedback         Feedback @relation(...)
}
```

### 3. Queue Configuration

```typescript
// BullMQ Queue for async processing
const sentimentQueue = new Queue("sentiment-analysis", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});
```

### 4. Processing Flow

```typescript
// When feedback is created
await sentimentQueue.add('analyze', {
  feedbackId: feedback.id,
  text: feedback.comment,
  priority: feedback.customerSegment === 'VIP' ? 1 : 5,
});

// Worker processes
Worker processes job → Call Hugging Face → Store results → Check alerts
```

---

## Performance Optimization

### Batch Processing

```typescript
// Process up to 10 feedback items in parallel
const batchSize = 10;
const promises = batch.map((item) => analyzeSentiment(item));
const results = await Promise.allSettled(promises);
```

### Caching Strategy

```typescript
// Cache analysis for duplicate feedback text (rare but possible)
const cacheKey = `sentiment:${hash(text)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Cache for 7 days
await redis.setex(cacheKey, 604800, JSON.stringify(result));
```

### Model Warm-up

```typescript
// On first API call, model may need 20s to load
// Implement warm-up on server start
async function warmUpModels() {
  await analyzeSentiment("Hello world"); // Warm up sentiment model
  await detectEmotion("I am happy"); // Warm up emotion model
}
```

---

## Alert Triggers

### Sentiment Spike Detection

```typescript
// Check if negative sentiment increases significantly
const recentNegative = await getRecentSentimentCount({
  sentiment: ["NEGATIVE", "VERY_NEGATIVE"],
  timeRange: "1h",
});

const threshold = 10; // 10 negative feedback in 1 hour
if (recentNegative >= threshold) {
  await createAlert({
    type: "SENTIMENT_SPIKE",
    severity: "HIGH",
    title: "Negative Sentiment Spike Detected",
    message: `${recentNegative} negative feedback received in the last hour`,
  });
}
```

### Topic Trending

```typescript
// Check if a topic suddenly gets more mentions
const topicMentions = await getTopicMentionCount({
  topicId: topic.id,
  timeRange: "1h",
});

if (topicMentions > topic.averageMentions * 3) {
  await createAlert({
    type: "TRENDING_TOPIC",
    severity: "MEDIUM",
    title: `Topic "${topic.name}" is trending`,
  });
}
```

---

## Cost Analysis

### Current Estimate (Based on MVP Usage)

**Assumptions:**

- 500 feedback/day average
- 200 characters per feedback
- 2 API calls per feedback (sentiment + emotion)

**Monthly Usage:**

- Total API calls: 500 × 2 × 30 = 30,000 calls/month
- Characters processed: 500 × 200 × 30 = 3M characters

**Cost:**

- Free tier covers: 1,000 calls/day = 30,000/month ✅
- **Monthly cost: $0** (within free tier)

### Scaling Cost Projection

| Daily Feedback | API Calls/Month | Tier        | Monthly Cost   |
| -------------- | --------------- | ----------- | -------------- |
| 500            | 30,000          | Free        | $0             |
| 1,000          | 60,000          | Pro         | $9             |
| 5,000          | 300,000         | Pro × 10    | $90            |
| 10,000+        | 600,000+        | Self-hosted | ~$50-100 (GPU) |

**Migration Point:** When reaching 5,000+ feedback/day consistently, migrate to self-hosted solution.

---

## Migration Path

### Phase 1: MVP (Current)

- ✅ Hugging Face Inference API
- ✅ Free tier (up to 1,000 requests/day)
- ✅ Quick implementation
- ✅ No infrastructure management

### Phase 2: Growth (1,000-5,000/day)

- Upgrade to Hugging Face Pro ($9/month)
- Implement more aggressive caching
- Optimize batch processing

### Phase 3: Scale (5,000+/day)

- Deploy self-hosted FastAPI service
- Use same Hugging Face models locally
- GPU instance for performance
- Total control over processing

### Self-Hosted Architecture (Future)

```
┌─────────────────────────────────────┐
│  RT-CX Backend (Node.js)            │
│  - Feedback API                      │
│  - BullMQ Queue                      │
└──────────────┬──────────────────────┘
               │ HTTP/gRPC
               ↓
┌─────────────────────────────────────┐
│  NLP Service (Python FastAPI)       │
│  - Hugging Face Transformers        │
│  - Model: distilbert, roberta       │
│  - GPU: NVIDIA T4 or better         │
└─────────────────────────────────────┘

Docker Compose:
- rt-cx-backend (Node.js)
- nlp-service (Python + GPU)
- postgres
- redis
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Processing metrics
sentimentAnalysis.processing.duration; // Average processing time
sentimentAnalysis.processing.success; // Success rate
sentimentAnalysis.processing.failures; // Failure count
sentimentAnalysis.api.rateLimit; // Rate limit hits
sentimentAnalysis.queue.backlog; // Queue depth

// Business metrics
sentimentAnalysis.distribution.positive; // % positive
sentimentAnalysis.distribution.negative; // % negative
sentimentAnalysis.emotion.breakdown; // Top emotions
sentimentAnalysis.alerts.triggered; // Alert count
```

### Logging

```typescript
logger.info("Sentiment analysis started", {
  feedbackId,
  textLength: text.length,
  channel: feedback.channel,
});

logger.info("Sentiment analysis completed", {
  feedbackId,
  sentiment: result.sentiment,
  confidence: result.confidence,
  duration: Date.now() - startTime,
});

logger.error("Sentiment analysis failed", {
  feedbackId,
  error: error.message,
  attempt: attemptNumber,
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe("SentimentService", () => {
  it("should analyze positive sentiment correctly");
  it("should analyze negative sentiment correctly");
  it("should detect emotions accurately");
  it("should handle API errors gracefully");
  it("should retry on rate limits");
  it("should fall back on API failure");
});
```

### Integration Tests

```typescript
describe("Sentiment Worker", () => {
  it("should process feedback from queue");
  it("should store results in database");
  it("should trigger alerts on negative spikes");
  it("should broadcast via WebSocket");
});
```

### Load Tests

```typescript
// Simulate high volume
for (let i = 0; i < 1000; i++) {
  await createFeedback({
    comment: generateRandomFeedback(),
  });
}
// Verify: All processed within SLA (< 5 minutes)
```

---

## Fallback Strategy

### Rule-Based Analysis (Backup)

If Hugging Face API is unavailable, fall back to simple rule-based analysis:

```typescript
function fallbackSentimentAnalysis(text: string) {
  const positiveWords = ["good", "great", "excellent", "love", "happy"];
  const negativeWords = ["bad", "poor", "hate", "terrible", "frustrated"];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter((w) =>
    lowerText.includes(w)
  ).length;
  const negativeCount = negativeWords.filter((w) =>
    lowerText.includes(w)
  ).length;

  if (negativeCount > positiveCount) {
    return { sentiment: "NEGATIVE", score: -0.5, confidence: 0.6 };
  } else if (positiveCount > negativeCount) {
    return { sentiment: "POSITIVE", score: 0.5, confidence: 0.6 };
  }
  return { sentiment: "NEUTRAL", score: 0, confidence: 0.5 };
}
```

---

## Security Considerations

### API Key Management

- ✅ Store in environment variables (never commit to git)
- ✅ Rotate keys every 90 days
- ✅ Use separate keys for dev/staging/production
- ✅ Monitor usage for anomalies

### Data Privacy

- ✅ Never send PII to external APIs (sanitize first)
- ✅ Respect GDPR/data retention policies
- ✅ Log API calls for audit trail
- ✅ Consider data residency requirements

---

## Future Enhancements

### Short-term (Next 3 months)

1. Add language detection (multi-language support)
2. Implement auto-topic extraction with zero-shot classification
3. Add sentiment trend analysis
4. Fine-tune models on banking-specific data

### Medium-term (6-12 months)

1. Migrate to self-hosted solution (when volume justifies)
2. Implement custom models for banking domain
3. Add aspect-based sentiment analysis (feature-specific sentiment)
4. Integrate with voice call transcription analysis

### Long-term (12+ months)

1. Build proprietary models trained on RT-CX data
2. Add predictive analytics (churn prediction)
3. Implement real-time sentiment tracking during calls
4. Multi-modal analysis (text + voice + metadata)

---

## References

- [Hugging Face Inference API Docs](https://huggingface.co/docs/api-inference)
- [DistilBERT Model Card](https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english)
- [Emotion Detection Model](https://huggingface.co/j-hartmann/emotion-english-distilroberta-base)
- [BullMQ Documentation](https://docs.bullmq.io/)

---

## Changelog

- **2025-11-12**: Initial NLP integration strategy documented
- **2025-11-12**: Selected Hugging Face as primary provider
- **2025-11-12**: Defined model selection and migration path
