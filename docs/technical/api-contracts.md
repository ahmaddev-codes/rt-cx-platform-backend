# API Design & Contracts

## API Response Envelope

Use a consistent response structure across all endpoints:

```typescript
// Success response
{
  "status": "ok",
  "data": { /* actual payload */ }
}

// Error response
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## REST API Design

### Endpoint Structure

```
GET    /api/v1/users           # List users
GET    /api/v1/users/:id       # Get user by ID
POST   /api/v1/users           # Create user
PUT    /api/v1/users/:id       # Update user
DELETE /api/v1/users/:id       # Delete user

GET    /api/v1/feedback        # List feedback
POST   /api/v1/feedback        # Submit feedback
GET    /api/v1/feedback/:id    # Get feedback details

GET    /api/v1/dashboard/stats # Dashboard statistics
GET    /api/v1/health          # Health check
```

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 202 | Accepted | Async job accepted |
| 204 | No Content | Successful DELETE with no body |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Type Definitions (Shared)

Create `types/api.types.ts` (shared between FE and BE):

```typescript
// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Feedback types
export interface Feedback {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  source: 'web' | 'mobile' | 'api';
  sentiment?: 'positive' | 'negative' | 'neutral';
  createdAt: string;
}

export interface CreateFeedbackDTO {
  rating: number;
  comment: string;
  source: 'web' | 'mobile' | 'api';
}

// API envelope
export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
```

## OpenAPI / Swagger Documentation

Install dependencies:
```powershell
pnpm add swagger-ui-express swagger-jsdoc
pnpm add -D @types/swagger-ui-express @types/swagger-jsdoc
```

Create `src/config/swagger.ts`:
```typescript
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RT-CX Platform API',
      version: '1.0.0',
      description: 'Real-time Customer Experience Platform API',
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.rt-cx.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'], // Path to route files
};

export const swaggerSpec = swaggerJSDoc(options);
```

Add Swagger route in `src/app.ts`:
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

Document routes with JSDoc comments:
```typescript
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 */
router.post('/login', loginController);
```

## GraphQL Alternative

If you prefer GraphQL over REST:

Install dependencies:
```powershell
pnpm add apollo-server-express graphql type-graphql
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript
```

Create `src/graphql/schema.ts`:
```typescript
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    role: String!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User!
    users: [User!]!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(email: String!, password: String!, name: String): AuthPayload!
  }
`;
```

Frontend codegen:
```powershell
npx graphql-codegen init
# Follow prompts to generate TypeScript types from schema
```

## tRPC Alternative (Type-Safe RPC)

For full end-to-end type safety in TypeScript monorepo:

Install dependencies:
```powershell
# Backend
pnpm add @trpc/server zod

# Frontend
pnpm add @trpc/client @trpc/react-query
```

Create `backend/src/trpc/router.ts`:
```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  login: t.procedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      // Login logic
      return { token: 'jwt-token', user: { id: '1', email: input.email } };
    }),

  getUsers: t.procedure.query(async () => {
    // Fetch users
    return [{ id: '1', email: 'test@example.com' }];
  }),
});

export type AppRouter = typeof appRouter;
```

Frontend usage:
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../backend/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

// In component
const { data } = trpc.getUsers.useQuery();
const login = trpc.login.useMutation();
```

## Pagination

Standard pagination pattern:
```typescript
GET /api/v1/users?page=1&limit=20&sort=-createdAt

Response:
{
  "status": "ok",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## Filtering & Search

```typescript
GET /api/v1/feedback?rating=5&source=web&search=great+service

// Backend implementation
const filters = {
  rating: req.query.rating ? parseInt(req.query.rating) : undefined,
  source: req.query.source,
};

const feedback = await prisma.feedback.findMany({
  where: {
    ...filters,
    OR: req.query.search
      ? [
          { comment: { contains: req.query.search, mode: 'insensitive' } },
        ]
      : undefined,
  },
});
```

## Rate Limiting

Implement per-endpoint rate limits:
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
});

app.use('/api/auth/login', authLimiter);
```

## CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://dashboard.rt-cx.com',
  ],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## Versioning Strategy

### URL Versioning (Recommended)
```
/api/v1/users
/api/v2/users
```

### Header Versioning
```
GET /api/users
Accept: application/vnd.rtcx.v2+json
```

Implement in Express:
```typescript
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

## Next Steps
- [Authentication](./authentication.md) - JWT flows and security
- [Backend Stack](./backend-stack.md) - Implement these patterns
- [Frontend Stack](./frontend-stack.md) - Consume the API
