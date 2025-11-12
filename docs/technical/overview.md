# Overview: Separated Frontend/Backend Architecture

## What This Means
Instead of using Next.js as a full-stack framework (with Route Handlers and Server Components), you split the application into:

1. **Frontend**: Next.js as a static site or SPA (no backend API routes)
   - React UI, client-side routing, data fetching
   - Deployed to Vercel, Netlify, or CDN
   - Calls backend API via HTTP/WebSocket

2. **Backend**: Standalone Node.js API server (Express, Fastify, NestJS, or tRPC)
   - REST/GraphQL endpoints
   - Database access (Prisma + Postgres)
   - Business logic, auth, background jobs
   - Deployed to Railway, Fly, Render, AWS, etc.

## When to Use Separated Architecture

### ✅ Choose separated if you have:
- **Multiple client apps**: Web dashboard, mobile app (iOS/Android), partner integrations, or third-party API consumers
- **Public API as a product**: Versioned, documented API that external developers use
- **Heavy backend workloads**: Long-running processes, streaming ingestion (Kafka/Flink), ML model serving, video/audio processing
- **Independent scaling needs**: Frontend traffic != backend traffic (e.g., lots of page views, fewer API calls)
- **Polyglot backend**: Need Python for ML, Go for performance, Node for API
- **Separate teams**: Frontend and backend teams work independently with different release cycles
- **Complex domain logic**: Rich business rules that benefit from layered architecture (controllers, services, repositories)
- **Advanced caching**: Need CDN for frontend assets + Redis/Varnish for backend API responses

### ❌ Avoid separated if:
- **Single web client**: Only your dashboard consumes the API
- **Small team**: < 5 developers; overhead of two repos/pipelines isn't worth it
- **Rapid prototyping**: Need to ship MVP quickly
- **Simple CRUD**: Most endpoints are basic database read/write
- **Tight coupling**: UI and API co-evolve rapidly; splitting slows iteration

## Decision Framework

| Criterion | Full-Stack Next.js | Separated FE/BE |
|-----------|-------------------|-----------------|
| **Number of clients** | 1 (web dashboard) | 2+ (web, mobile, API consumers) |
| **Team size** | 1-5 devs | 5+ devs or split teams |
| **API visibility** | Internal only | Public/versioned |
| **Workload complexity** | Short requests (<10s) | Long-running, streaming, heavy compute |
| **Deployment cadence** | Frequent, coupled | Independent FE/BE releases |
| **Technology needs** | JavaScript/TypeScript | Polyglot (Node + Python + Go) |
| **Ops overhead tolerance** | Low (Vercel one-click) | Medium (manage multiple services) |

## Architecture Comparison

### Full-Stack Next.js
```
[Browser] <-> [Next.js App (Vercel)]
                    |
              [Postgres] [Redis]
              [Worker Service]
```
- Next.js handles UI rendering + API routes
- Background jobs run in separate worker
- Simple, fewer moving parts

### Separated Frontend/Backend
```
[Browser] <-> [Next.js Static (Vercel/CDN)]
                    |
                   HTTP
                    ↓
              [API Server (Railway/Fly)]
                    |
              [Postgres] [Redis] [S3]
              [Worker Service]
              [ML Service (Python)]
```
- Frontend is pure UI, deployed to CDN
- Backend is dedicated API cluster
- Can add specialized services (ML, ingestion)

## Example Use Cases

### Good fit for separated:
1. **CX Platform with Mobile App**: Your dashboard + iOS/Android apps all call the same REST API
2. **Partner API**: Third-party SaaS tools integrate via your public API
3. **High-volume ingestion**: Real-time webhook receiver processing 10k+ req/sec
4. **Multi-language stack**: API in Node, ML models served via Python FastAPI, data pipelines in Go

### Good fit for full-stack Next.js:
1. **Internal dashboard**: Only your team uses the web UI
2. **SaaS MVP**: Shipping v1 quickly with 2-3 developers
3. **Content site with forms**: Mostly static with some server actions for contact/signup

## Migration Path

**Start full-stack, migrate later**:
- Build with Next.js full-stack initially
- Keep API routes thin; move logic to `src/lib/services/`
- When ready to separate:
  1. Extract services to standalone API repo
  2. Convert Next.js to static export or SPA mode
  3. Point frontend to new API via env vars

**Start separated, merge later** (rare):
- If clients disappear or API becomes internal-only
- Merge backend routes into Next.js Route Handlers
- Keep shared types and migrate incrementally

## Next Steps
If you've decided on separated architecture, continue to:
- [Architecture Design](./architecture.md) - Detailed component diagram
- [Backend Stack & Setup](./backend-stack.md) - How to scaffold the API
- [Frontend Stack & Setup](./frontend-stack.md) - How to configure Next.js as SPA
