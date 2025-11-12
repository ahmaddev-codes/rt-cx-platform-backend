# Quick Start Guide

## Prerequisites

Before starting, ensure you have installed:

- Node.js 18+ (https://nodejs.org/)
- pnpm (run: `npm install -g pnpm`)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

Alternatively, use Docker to run everything.

---

## Option 1: Full Docker Setup (Recommended for Quick Start)

This will run PostgreSQL, Redis, and the backend in containers:

```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check service status
docker-compose ps

# Run database migrations (first time only)
docker-compose exec backend pnpm db:migrate

# Seed the database (first time only)
docker-compose exec backend pnpm db:seed

# Stop all services
docker-compose down
```

**Access:**

- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api-docs
- Health Check: http://localhost:4000/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Option 2: Local Development

If you prefer running PostgreSQL and Redis separately:

### Step 1: Install Dependencies

```powershell
cd c:\Users\omega\Desktop\project\rt-cx-platform-backend
pnpm install
```

### Step 2: Setup Environment

```powershell
# Copy the example environment file
cp .env.example .env

# Open .env and update these values:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rt_cx
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
# FRONTEND_URL=http://localhost:3000
```

### Step 3: Start PostgreSQL & Redis

**Using Docker:**

```powershell
docker-compose up postgres redis -d
```

**Using Installed Services:**

```powershell
# Start PostgreSQL service
net start postgresql-x64-15

# Start Redis service
redis-server
```

### Step 4: Setup Database

```powershell
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database with sample data
pnpm db:seed
```

### Step 5: Start Development Server

```powershell
pnpm dev
```

**Access:**

- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api-docs
- Health Check: http://localhost:4000/health

### Step 6: Open Prisma Studio (Optional)

View and edit database data visually:

```powershell
pnpm db:studio
```

Opens at: http://localhost:5555

---

## Verify Setup

### 1. Health Check

```powershell
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-11T...",
  "environment": "development"
}
```

### 2. Check API Documentation

Open in browser: http://localhost:4000/api-docs

You should see the Swagger UI with API documentation.

### 3. Test Database Connection

```powershell
# Open Prisma Studio
pnpm db:studio
```

You should see:

- 3 users (admin, manager, agent)
- 7 topics
- 5 feedback entries
- 2 alerts

---

## Default Login Credentials

After running the seed script, use these credentials:

| Role    | Email            | Password     |
| ------- | ---------------- | ------------ |
| Admin   | admin@rtcx.com   | Password123! |
| Manager | manager@rtcx.com | Password123! |
| Agent   | agent@rtcx.com   | Password123! |

---

## Common Commands

```powershell
# Development
pnpm dev              # Start development server with hot reload
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:migrate       # Run database migrations
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database with sample data
pnpm db:studio        # Open Prisma Studio (database GUI)

# Testing
pnpm test             # Run tests (when implemented)
pnpm lint             # Lint code
pnpm format           # Format code

# Docker
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f backend          # View backend logs
docker-compose exec backend pnpm dev    # Run command in container
```

---

## Troubleshooting

### Error: Cannot connect to database

**Solution:**

```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# Or if using local PostgreSQL
Get-Service postgresql-x64-15

# Verify DATABASE_URL in .env matches your setup
```

### Error: Cannot connect to Redis

**Solution:**

```powershell
# Check if Redis is running
docker-compose ps redis

# Or test Redis connection
redis-cli ping
# Should return: PONG
```

### Error: Module not found

**Solution:**

```powershell
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Error: Prisma Client not generated

**Solution:**

```powershell
pnpm db:generate
```

### Port 4000 already in use

**Solution:**

```powershell
# Change PORT in .env
PORT=4001

# Or kill process using port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

---

## Next Steps

Once the backend is running:

1. ✅ Review **PROJECT_SUMMARY.md** for an overview
2. ✅ Read **IMPLEMENTATION_GUIDE.md** for detailed implementation steps
3. ✅ Explore API documentation at http://localhost:4000/api-docs
4. ✅ Check database schema in Prisma Studio
5. ✅ Start implementing auth, feedback, and dashboard endpoints

---

## Project Structure Overview

```
rt-cx-platform-backend/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── prisma/                # Database
│   ├── schema.prisma      # Schema definition
│   └── seed.ts            # Seed data
├── docs/                  # Documentation
├── .env.example           # Environment template
├── docker-compose.yml     # Docker configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## Getting Help

- Check **IMPLEMENTATION_GUIDE.md** for implementation details
- Review **PROJECT_SUMMARY.md** for project overview
- Explore existing documentation in `docs/technical/`
- View Swagger docs at http://localhost:4000/api-docs

Happy coding! 🚀
