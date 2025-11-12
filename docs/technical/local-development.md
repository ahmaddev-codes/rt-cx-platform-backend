# Local Development Setup

## Prerequisites

- Node.js 18+ LTS
- pnpm (package manager)
- Docker Desktop for Windows
- Git
- VS Code (recommended)

## Quick Start

### 1. Clone and Install

```powershell
# Clone repository
git clone https://github.com/ahmaddev-codes/rt-cx-platform.git
cd rt-cx-platform

# Install dependencies (if using monorepo)
pnpm install

# Or install separately
cd backend
pnpm install
cd ../frontend
pnpm install
```

### 2. Start Local Services (Docker Compose)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: rtcx-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rt_cx_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: rtcx-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: Mailhog for email testing
  mailhog:
    image: mailhog/mailhog:latest
    container_name: rtcx-mailhog
    ports:
      - "1025:1025" # SMTP
      - "8025:8025" # Web UI
    logging:
      driver: none

volumes:
  postgres_data:
  redis_data:
```

Start services:
```powershell
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Setup Backend

```powershell
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your local values
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rt_cx_dev
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-local-dev-secret-min-32-chars
# FRONTEND_URL=http://localhost:3000

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start backend dev server
pnpm dev
```

Backend should be running on `http://localhost:4000`

### 4. Setup Frontend

```powershell
cd frontend

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Start frontend dev server
pnpm dev
```

Frontend should be running on `http://localhost:3000`

---

## Development Workflow

### Running All Services

Create a root-level `package.json` script (if using monorepo):

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\"",
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "db:studio": "pnpm --filter backend prisma studio",
    "services:up": "docker compose up -d",
    "services:down": "docker compose down"
  }
}
```

Install concurrently:
```powershell
pnpm add -D -w concurrently
```

Run all:
```powershell
pnpm services:up
pnpm dev
```

### Viewing Database

Prisma Studio provides a GUI for database:
```powershell
cd backend
npx prisma studio
# Opens http://localhost:5555
```

Or use pgAdmin / DBeaver:
- Host: localhost
- Port: 5432
- Database: rt_cx_dev
- User: postgres
- Password: postgres

---

## Testing Locally

### Backend Tests

```powershell
cd backend

# Run unit tests
pnpm test

# Run integration tests (requires test DB)
pnpm test:integration

# Run with coverage
pnpm test:coverage
```

### Frontend Tests

```powershell
cd frontend

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Open Playwright UI
pnpm playwright test --ui
```

---

## Common Tasks

### Reset Database

```powershell
cd backend

# Reset database and re-run migrations
npx prisma migrate reset

# Or manually
npx prisma migrate reset --skip-seed
npx prisma db seed
```

### Clear Redis Cache

```powershell
docker exec -it rtcx-redis redis-cli FLUSHALL
```

### Restart Services

```powershell
docker compose restart

# Or restart specific service
docker compose restart postgres
```

### View Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres

# Backend logs
cd backend
pnpm dev
# Logs will appear in terminal

# Frontend logs
cd frontend
pnpm dev
```

---

## Environment Variables Reference

### Backend (.env)

```bash
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rt_cx_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (optional, using Mailhog locally)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# AWS / File Storage (optional for local dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
```

### Frontend (.env.local)

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Optional: Analytics, Sentry (disable locally)
# NEXT_PUBLIC_SENTRY_DSN=
# NEXT_PUBLIC_POSTHOG_KEY=
```

---

## Troubleshooting

### Port Already in Use

If ports 3000, 4000, 5432, or 6379 are occupied:

**Find process using port (PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess
```

**Kill process:**
```powershell
Stop-Process -Id <PID>
```

Or change ports in `.env` and `docker-compose.yml`.

### Docker Compose Issues

**Services won't start:**
```powershell
# Check Docker Desktop is running
docker ps

# Remove containers and volumes
docker compose down -v
docker compose up -d
```

**Database connection errors:**
- Wait for healthcheck to pass: `docker compose ps`
- Check DATABASE_URL matches compose config
- Try: `docker compose restart postgres`

### Prisma Migration Errors

**Migration out of sync:**
```powershell
npx prisma migrate reset
npx prisma migrate dev
```

**Can't generate client:**
```powershell
npx prisma generate --force
```

### Frontend Can't Reach Backend

- Verify backend is running: `curl http://localhost:4000/health`
- Check NEXT_PUBLIC_API_URL in `.env.local`
- Check CORS settings in backend allow `http://localhost:3000`
- Clear browser cache / use incognito

---

## Hot Reloading

Both frontend and backend support hot reload:

- **Backend**: `tsx watch` automatically restarts on file changes
- **Frontend**: Next.js Fast Refresh updates instantly

No need to manually restart during development.

---

## VS Code Recommended Extensions

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "prisma.prisma",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright"
  ]
}
```

## Next Steps
- [Testing Strategy](./testing.md) - Write tests for FE/BE
- [CI/CD Pipeline](./ci-cd.md) - Automate builds and deploys
- [Deployment Guide](./deployment.md) - Deploy to production
