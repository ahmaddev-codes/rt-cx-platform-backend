# Separated Frontend/Backend Architecture

## Quick Navigation
- [Overview & When to Use](./overview.md) - Decision criteria and use cases
- [Architecture Design](./architecture.md) - System components and data flow
- [Backend Stack & Setup](./backend-stack.md) - Node.js/Express/NestJS backend with Prisma
- [Frontend Stack & Setup](./frontend-stack.md) - Next.js frontend as SPA/SSG
- [API Design & Contracts](./api-contracts.md) - REST/GraphQL/tRPC patterns
- [Authentication & Authorization](./authentication.md) - JWT, session strategies, CORS
- [Database & ORM](./database.md) - Prisma + Postgres for backend
- [Real-time & WebSockets](./realtime.md) - Socket.io or SSE patterns
- [File Storage & CDN](./storage.md) - S3/R2 for uploads, CDN for assets
- [Background Jobs](./background-jobs.md) - BullMQ workers on backend
- [Testing Strategy](./testing.md) - Backend API tests, frontend E2E
- [CI/CD Pipeline](./ci-cd.md) - Separate pipelines for FE and BE
- [Deployment Guide](./deployment.md) - Vercel for FE, Railway/Fly/AWS for BE
- [Local Development](./local-development.md) - Docker Compose multi-service setup
- [Migration Path](./migration-path.md) - How to migrate from/to full-stack Next.js

## When to Choose This Architecture
✅ You need:
- Public versioned API for multiple clients (web, mobile, partners)
- Independent scaling of frontend and backend
- Polyglot backend services (Node + Python ML services)
- Heavy ingestion, streaming, or long-running processes
- Team structure with separate FE/BE developers

## Key Benefits
- **Independent deployment**: Deploy FE and BE separately
- **Technology flexibility**: Use best tool for each layer
- **Clear contracts**: Versioned API with OpenAPI/GraphQL schemas
- **Better caching**: CDN for frontend, API caching on backend
- **Scalability**: Scale API and UI independently

## Key Challenges
- **More complexity**: Two codebases, deployment pipelines
- **CORS and auth**: Cross-origin setup, token management
- **Type safety**: Need codegen or tRPC to share types
- **Local dev**: Multiple services to run (Docker Compose recommended)

Start with [Overview & When to Use](./overview.md) to understand the approach.