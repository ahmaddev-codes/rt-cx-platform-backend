# Hugging Face NLP Integration - Setup Guide

## Overview

The RT-CX Platform uses Hugging Face Inference API for sentiment analysis and emotion detection. This provides powerful NLP capabilities with zero infrastructure setup.

## Prerequisites

1. **Hugging Face Account**: Create a free account at [huggingface.co](https://huggingface.co)
2. **API Token**: Generate an API token from [Settings > Access Tokens](https://huggingface.co/settings/tokens)

## Configuration

### 1. Get Your API Key

1. Visit https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it (e.g., "rt-cx-platform-production")
4. Select "Read" scope (sufficient for inference)
5. Copy the generated token (starts with `hf_`)

### 2. Update Environment Variables

Add to your `.env` file:

```bash
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Verify Configuration

```bash
# Test the build
pnpm build

# Start the server
pnpm dev
```

On startup, you should see:

```
✅ Redis connected
✅ Background workers initialized
✅ NLP models warmed up
🚀 Server running on port 4000
```

## How It Works

### Architecture Flow

```
Feedback Created → BullMQ Queue → Sentiment Worker → Hugging Face API → Database → Alerts → WebSocket
```

### Models Used

1. **Sentiment Analysis**: `distilbert-base-uncased-finetuned-sst-2-english`
   - Detects: VERY_POSITIVE, POSITIVE, NEUTRAL, NEGATIVE, VERY_NEGATIVE
   - Accuracy: ~94%
   - Latency: <100ms

2. **Emotion Detection**: `j-hartmann/emotion-english-distilroberta-base`
   - Detects: Joy, Sadness, Anger, Fear, Surprise, Disgust, Neutral
   - Maps to: JOY, SATISFACTION, NEUTRAL, FRUSTRATION, ANGER, SADNESS, CONFUSION, SURPRISE

### Automatic Alert Triggers

The system automatically creates alerts when:

- **Sentiment Spike**: 10+ negative feedback in 1 hour, or 50+ in 24 hours, or 70%+ negative ratio
- **High Volume Negative**: 20+ negative feedback in 1 hour

## Usage Limits & Pricing

### Free Tier (Default)

- **Limit**: 1,000 requests/day
- **Cost**: $0/month
- **Sufficient for**: MVP, small teams, up to ~40 feedback/hour

### Pro Tier

- **Limit**: 30,000 requests/month (~1,000/day)
- **Cost**: $9/month
- **Sufficient for**: Growing teams, 1K-30K requests/day

### Self-Hosted (Future)

- **Limit**: Unlimited
- **Cost**: ~$50-100/month (GPU server)
- **Migration**: Easy (same models, just change endpoint)

## Testing Sentiment Analysis

### Create Feedback with Comments

```bash
curl -X POST http://localhost:4000/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "channel": "IN_APP_SURVEY",
    "rating": 1,
    "comment": "This app is terrible. Very frustrated with the slow performance.",
    "customerSegment": "VIP"
  }'
```

### Monitor Queue Status

```bash
# Check Redis queue
redis-cli LLEN bull:sentiment-analysis:wait

# View worker logs
# Watch terminal for: "Sentiment analysis job completed"
```

### View Results

```bash
# Get feedback with sentiment
GET http://localhost:4000/api/feedback/{feedbackId}

# Response includes:
{
  "sentimentAnalysis": {
    "sentiment": "VERY_NEGATIVE",
    "sentimentScore": -0.95,
    "confidence": 0.98,
    "primaryEmotion": "FRUSTRATION",
    "emotions": {
      "anger": 0.7,
      "frustration": 0.9,
      "sadness": 0.4
    },
    "keyPhrases": ["terrible", "frustrated", "slow", "performance"]
  }
}
```

## Troubleshooting

### Model Loading (503 Error)

**Problem**: First request returns 503 "Model is loading"
**Solution**: System automatically retries after 20 seconds. Models warm up on server start.

### Rate Limit (429 Error)

**Problem**: Exceeded 1,000 requests/day on free tier
**Solution**:

1. Upgrade to Pro tier ($9/mo)
2. Implement caching (7-day TTL for duplicate text)
3. Batch process during off-peak hours

### No Sentiment Analysis Results

**Problem**: Feedback created but no sentiment data
**Checklist**:

1. Verify `HUGGINGFACE_API_KEY` in `.env`
2. Check Redis is running: `redis-cli ping` (should return `PONG`)
3. View worker logs for errors
4. Ensure feedback has a `comment` field (empty comments are skipped)

### Worker Not Processing

**Problem**: Jobs stuck in queue
**Solution**:

```bash
# Restart worker
pm2 restart rt-cx-worker

# Or in dev mode
pnpm dev
```

## Advanced Configuration

### Custom Models

Edit `src/config/nlp.ts`:

```typescript
export const NLP_CONFIG = {
  MODELS: {
    SENTIMENT: "your-custom-sentiment-model",
    EMOTION: "your-custom-emotion-model",
  },
};
```

### Batch Size

Increase parallel processing:

```typescript
PROCESSING: {
  BATCH_SIZE: 20, // Process 20 feedback items in parallel
}
```

### Alert Thresholds

Customize alert sensitivity:

```typescript
ALERT_THRESHOLDS: {
  SENTIMENT_SPIKE: {
    NEGATIVE_COUNT_1H: 5,  // Lower threshold = more sensitive
    NEGATIVE_COUNT_24H: 25,
    NEGATIVE_RATIO_1H: 0.5,
  },
}
```

## Monitoring

### Key Metrics to Track

1. **Queue Depth**: `bull:sentiment-analysis:wait` length
2. **Processing Rate**: Jobs/second
3. **API Latency**: Hugging Face response time
4. **Error Rate**: Failed jobs count
5. **Alert Frequency**: Alerts created/day

### Logs

```bash
# View all sentiment logs
grep "sentiment" logs/combined.log

# View alert creation
grep "Created sentiment alert" logs/combined.log

# View API errors
grep "Sentiment analysis API error" logs/error.log
```

## Migration Path

When you outgrow Hugging Face free tier:

1. **Pro Tier** ($9/mo): Just upgrade in Hugging Face dashboard
2. **Self-Hosted** ($50-100/mo):
   - Deploy same models on GPU server
   - Update `HUGGINGFACE.BASE_URL` in config
   - No code changes required

## Support

For issues or questions:

- **Documentation**: See `docs/technical/nlp-integration.md`
- **Hugging Face Status**: https://status.huggingface.co
- **Model Cards**:
  - [Sentiment Model](https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english)
  - [Emotion Model](https://huggingface.co/j-hartmann/emotion-english-distilroberta-base)
