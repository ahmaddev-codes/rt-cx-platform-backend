# RT-CX Platform Backend

Real-time Customer Experience Platform - Backend API Server

## Overview

This backend powers the RT-CX Platform, an intelligent system that captures customer feedback in real-time, analyzes sentiment using AI, and provides actionable insights through live dashboards.

## Features

- **Multi-Channel Feedback Collection**: In-app surveys, chatbot logs, voice transcripts, social media
- **AI-Powered Sentiment Analysis**: Emotion detection, topic modeling, trend analysis
- **Real-Time Dashboard**: WebSocket-powered live updates
- **Smart Alerts**: Automated notifications for sentiment spikes
- **Role-Based Access Control**: Admin, Manager, and Agent roles
- **RESTful API**: Versioned, documented endpoints

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+ (Prisma ORM)
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.IO
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

```powershell
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration

# Setup database
pnpm db:migrate
pnpm db:generate
pnpm db:seed

# Start development server
pnpm dev
```

Server will start at `http://localhost:4000`

### Docker Setup

```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Project Structure

```
src/
├── config/           # Configuration (env, constants, swagger)
├── controllers/      # Route handlers
├── services/         # Business logic
├── repositories/     # Data access layer
├── middleware/       # Express middleware
├── routes/           # API routes
├── types/            # TypeScript types
├── utils/            # Helper functions
├── workers/          # Background jobs
├── app.ts            # Express app setup
└── server.ts         # Entry point

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Database migrations
└── seed.ts           # Seed data
```

## API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:4000/api-docs`
- Health Check: `http://localhost:4000/health`

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm lint` - Lint code
- `pnpm format` - Format code
- `pnpm db:migrate` - Run database migrations
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:seed` - Seed database
- `pnpm db:studio` - Open Prisma Studio

## Environment Variables

See `.env.example` for all available configuration options.

## Testing

```powershell
# Run all tests
pnpm test

# Run tests in CI mode
pnpm test:ci

# Run specific test file
pnpm test src/services/sentiment.test.ts
```

## Deployment

See [docs/technical/deployment.md](docs/technical/deployment.md) for deployment guides for:

- Railway
- Fly.io
- AWS ECS
- Google Cloud Run

## Documentation

- [Architecture](docs/technical/architecture.md)
- [API Contracts](docs/technical/api-contracts.md)
- [Backend Stack](docs/technical/backend-stack.md)
- [Local Development](docs/technical/local-development.md)

## License

ISC
