# Backend Stack & Setup

## Technology Choices

### Core Framework Options

#### Option 1: Express (Recommended for simplicity)
- **Pros**: Lightweight, massive ecosystem, well-understood
- **Cons**: Less opinionated, need to add structure manually
- **Best for**: Teams familiar with Node.js basics, want flexibility

#### Option 2: Fastify (Recommended for performance)
- **Pros**: Faster than Express, built-in validation, modern plugins
- **Cons**: Smaller ecosystem than Express
- **Best for**: High-throughput APIs, teams prioritizing speed

#### Option 3: NestJS (Recommended for large teams)
- **Pros**: TypeScript-first, opinionated structure, built-in DI, decorators
- **Cons**: Steeper learning curve, more boilerplate
- **Best for**: Enterprise teams, microservices, Angular-like patterns

**Recommendation for rt-cx-platform**: Start with **Express** or **Fastify** for simplicity; migrate to NestJS if team grows beyond 10 developers.

---

## Stack Components

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 18+ | JavaScript backend |
| **Framework** | Express / Fastify | HTTP server |
| **Language** | TypeScript | Type safety |
| **ORM** | Prisma | Database access |
| **Database** | PostgreSQL 15+ | Primary data store |
| **Cache/Queue** | Redis | Caching + BullMQ |
| **Validation** | Zod | Request/response schemas |
| **Auth** | JWT + bcrypt | Token-based auth |
| **Testing** | Vitest + Supertest | Unit + integration tests |
| **Documentation** | Swagger/OpenAPI | API docs |
| **Logging** | Pino | Structured JSON logs |

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   └── feedback.controller.ts
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   └── feedback.service.ts
│   ├── repositories/       # Data access layer (Prisma)
│   │   ├── users.repository.ts
│   │   └── feedback.repository.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/             # Route definitions
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── feedback.routes.ts
│   ├── types/              # TypeScript types
│   │   ├── express.d.ts
│   │   └── api.types.ts
│   ├── utils/              # Helpers
│   │   ├── jwt.ts
│   │   ├── redis.ts
│   │   └── validation.ts
│   ├── config/             # Configuration
│   │   ├── env.ts          # Zod env validation
│   │   └── constants.ts
│   ├── app.ts              # Express/Fastify app setup
│   └── server.ts           # Entry point
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Setup Instructions (PowerShell)

### 1. Initialize Backend Project

```powershell
# Create backend directory
mkdir backend
cd backend

# Initialize pnpm project
pnpm init

# Install dependencies
pnpm add express cors helmet express-rate-limit
pnpm add @prisma/client bcryptjs jsonwebtoken zod pino ioredis bullmq
pnpm add -D typescript @types/node @types/express @types/bcryptjs @types/jsonwebtoken
pnpm add -D tsx nodemon prisma vitest supertest @types/supertest
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 2. Configure TypeScript

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Setup Prisma

```powershell
npx prisma init --datasource-provider postgresql
```

Edit `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

Run migration:
```powershell
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Create Basic Express App

Create `src/app.ts`:
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(logger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}
```

Create `src/server.ts`:
```typescript
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 5. Environment Variables

Create `.env.example`:
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rt_cx
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

Create `src/config/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

### 6. Package Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest",
    "test:ci": "vitest run",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

---

## Authentication Implementation

### JWT Service (`src/utils/jwt.ts`)
```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; role: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string; role: string };
}
```

### Auth Middleware (`src/middleware/auth.middleware.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Extend Express Request type
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', error: 'Invalid token' });
  }
}
```

---

## Docker Setup

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

Create `docker-compose.yml` (for local dev):
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rt_cx
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/rt_cx
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src

volumes:
  postgres_data:
```

---

## Testing

Create `tests/integration/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('Auth API', () => {
  const app = createApp();

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ok');
    expect(response.body.data).toHaveProperty('token');
  });
});
```

---

## Deployment

### Railway
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Fly.io
```powershell
# Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Deploy
fly launch
fly deploy
```

---

## Next Steps
- [Frontend Stack & Setup](./frontend-stack.md) - Configure Next.js to call this API
- [API Design & Contracts](./api-contracts.md) - Define REST endpoints and types
- [Authentication](./authentication.md) - Detailed auth flows
