# Architecture Design: Separated Frontend/Backend

## High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Web Dashboard (Next.js)  │  Mobile App (React Native)      │
│  Partner Integrations     │  Admin Panel                     │
└─────────────────────────────────────────────────────────────┘
                           │
                          HTTP/WSS
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY / LB                        │
│              (Optional: Kong, AWS ALB, Nginx)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                        │
│  Node.js (Express/Fastify/NestJS)                           │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Auth Service │ Data Service │ Webhook API  │            │
│  │ REST/GraphQL │ Business     │ Streaming    │            │
│  └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘
        │              │                  │
        ↓              ↓                  ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   S3/R2      │
│  (Prisma)    │ │ Cache/Queue  │ │ File Storage │
└──────────────┘ └──────────────┘ └──────────────┘
                      │
                      ↓
            ┌──────────────────┐
            │ Background Worker│
            │   (BullMQ)       │
            └──────────────────┘
                      │
                      ↓
            ┌──────────────────┐
            │  ML/AI Service   │
            │  (Python/FastAPI)│
            └──────────────────┘
```

## Layer Responsibilities

### 1. Client Layer (Frontend)
**Technology**: Next.js (static export or SPA mode), React, TypeScript

**Responsibilities**:
- UI rendering and user interactions
- Client-side routing
- State management (Zustand, Redux, or React Context)
- API client (axios, fetch, TanStack Query)
- Authentication token storage (cookies/localStorage)
- Form validation and UX feedback

**Does NOT**:
- Access database directly
- Run business logic
- Store sensitive secrets

**Deployment**: Vercel, Netlify, Cloudflare Pages, or CDN (S3 + CloudFront)

---

### 2. API Gateway (Optional)
**Technology**: Kong, AWS API Gateway, Nginx, Traefik

**Responsibilities** (if used):
- Rate limiting and throttling
- Request routing to services
- SSL termination
- API versioning (/v1, /v2)
- Request/response logging

**When to add**:
- Multiple backend services
- Need centralized rate limiting
- Public API with SLAs

---

### 3. Backend API Server
**Technology**: Node.js + Express/Fastify/NestJS + Prisma + TypeScript

**Responsibilities**:
- REST or GraphQL endpoints
- Authentication and authorization (JWT, sessions)
- Business logic and validation
- Database queries via Prisma
- Enqueue background jobs to Redis
- WebSocket server for real-time features
- Integration with third-party APIs
- API documentation (OpenAPI/Swagger)

**Structure** (example):
```
backend/
├── src/
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Data access (Prisma)
│   ├── middleware/     # Auth, logging, validation
│   ├── types/          # TypeScript interfaces
│   ├── utils/          # Helpers
│   └── app.ts          # Express/Fastify app
├── prisma/
│   └── schema.prisma
├── tests/
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Deployment**: Railway, Fly.io, Render, AWS ECS, Google Cloud Run

---

### 4. Database (PostgreSQL)
**Technology**: PostgreSQL 15+, accessed via Prisma ORM

**Responsibilities**:
- Persistent storage of users, data, configs
- ACID transactions
- Relational queries and joins

**Deployment**: Railway, Render, Fly Postgres, AWS RDS, Supabase

---

### 5. Cache & Queue (Redis)
**Technology**: Redis 7+

**Responsibilities**:
- API response caching (reduce DB load)
- Rate limiting counters
- Session storage (if not using DB sessions)
- Job queue for BullMQ

**Deployment**: Railway, Fly Redis, AWS ElastiCache, Upstash

---

### 6. File Storage (S3/R2)
**Technology**: AWS S3, Cloudflare R2, Backblaze B2

**Responsibilities**:
- User uploads (avatars, files)
- Static assets (images, videos)
- Exports (CSV, PDF reports)

**Access pattern**:
- Backend generates presigned URLs for uploads
- Frontend uploads directly to S3 (or via backend proxy)
- CDN serves files for low-latency reads

---

### 7. Background Worker
**Technology**: Node.js + BullMQ + Redis

**Responsibilities**:
- Process async jobs (email sending, data aggregation)
- Scheduled tasks (cron-like)
- Retry failed jobs with exponential backoff

**Deployment**: Same infra as backend (Railway/Fly worker process)

---

### 8. ML/AI Service (Optional)
**Technology**: Python + FastAPI + Hugging Face/TensorFlow

**Responsibilities**:
- Sentiment analysis, NLP tasks
- Model inference
- Expose HTTP endpoints consumed by Node backend

**Deployment**: Railway, Fly, AWS Lambda (for inference), SageMaker

---

## Data Flow Examples

### Example 1: User Login
1. **Frontend** sends `POST /api/auth/login { email, password }` to backend
2. **Backend** validates credentials, queries DB via Prisma
3. **Backend** generates JWT, returns `{ token, user }`
4. **Frontend** stores JWT in httpOnly cookie or localStorage
5. **Frontend** includes `Authorization: Bearer <token>` in subsequent requests

### Example 2: Real-Time Dashboard Update
1. **Backend** receives webhook from external service
2. **Backend** processes data, updates Postgres
3. **Backend** publishes event to Redis pub/sub
4. **WebSocket server** (in backend) broadcasts to connected clients
5. **Frontend** receives WebSocket message, updates UI

### Example 3: File Upload
1. **Frontend** requests presigned URL: `GET /api/upload/presigned-url`
2. **Backend** generates S3 presigned URL, returns to frontend
3. **Frontend** uploads file directly to S3 using presigned URL
4. **Frontend** sends `POST /api/files { s3Key, metadata }` to backend
5. **Backend** stores file metadata in Postgres

### Example 4: Background Job (Email)
1. **Frontend** submits form: `POST /api/contact`
2. **Backend** validates, enqueues job to BullMQ: `emailQueue.add('send', { to, subject })`
3. **Backend** returns `202 Accepted { jobId }`
4. **Worker** consumes job, sends email via SendGrid/AWS SES
5. **Worker** updates job status in Redis
6. **Frontend** polls `GET /api/jobs/:id` or listens via WebSocket for completion

---

## Security Considerations

### CORS
- Backend must set `Access-Control-Allow-Origin` headers
- Use `cors` middleware in Express/Fastify
- Whitelist specific frontend origins (not `*` in production)

### Authentication
- Use JWT (stateless) or sessions (DB-backed)
- Store JWT in httpOnly cookies (mitigates XSS) or secure localStorage
- Refresh token rotation for long-lived sessions

### Authorization
- Implement RBAC (Role-Based Access Control) in backend
- Check user permissions before processing requests
- Use middleware to protect routes

### Rate Limiting
- Apply per-IP and per-user rate limits
- Use Redis + express-rate-limit or custom middleware

### Input Validation
- Use Zod, Joi, or class-validator for request schemas
- Sanitize inputs to prevent SQL injection (Prisma helps)

### Secrets Management
- Store secrets in environment variables
- Use Doppler, AWS Secrets Manager, or Vault in production
- Never commit `.env` files

---

## Monitoring & Observability

- **Logs**: Structured logging with pino or winston; ship to Datadog, LogDNA
- **Errors**: Sentry for backend exceptions
- **Metrics**: Prometheus + Grafana for API latency, throughput
- **Tracing**: OpenTelemetry or Jaeger for distributed tracing
- **Uptime**: UptimeRobot, Pingdom for health checks

---

## Deployment Architecture

### Development
```
[Docker Compose]
├── frontend (Next.js dev server :3000)
├── backend (Node.js :4000)
├── postgres :5432
├── redis :6379
└── worker
```

### Production
```
[Vercel] frontend.example.com (CDN + Next.js static)
    ↓ HTTPS
[Railway/Fly] api.example.com (Node.js cluster + workers)
    ↓
[Managed Postgres] (Railway/RDS)
[Managed Redis] (Fly/ElastiCache)
[S3/R2] uploads.example.com
```

---

## Scaling Strategies

### Horizontal Scaling
- Run multiple backend instances behind load balancer
- Use sticky sessions for WebSocket connections
- Stateless API design (JWT, no in-memory sessions)

### Database Scaling
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer)
- Sharding or partitioning for massive datasets

### Caching
- Redis for hot data
- CDN for frontend assets and static API responses
- Application-level caching (in-memory LRU cache)

### Async Offloading
- Move slow operations to background jobs
- Use message queues (BullMQ, RabbitMQ) for decoupling

---

## Next Steps
- [Backend Stack & Setup](./backend-stack.md) - Scaffold the API server
- [Frontend Stack & Setup](./frontend-stack.md) - Configure Next.js as SPA
- [API Design & Contracts](./api-contracts.md) - Define REST/GraphQL schemas
