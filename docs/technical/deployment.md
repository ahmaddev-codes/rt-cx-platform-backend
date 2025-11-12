# Deployment Guide

## Deployment Architecture

### Recommended Setup

```
Frontend:  Vercel / Netlify / Cloudflare Pages
Backend:   Railway / Fly.io / Render
Database:  Railway Postgres / Fly Postgres / AWS RDS
Redis:     Railway Redis / Fly Redis / AWS ElastiCache
Storage:   AWS S3 / Cloudflare R2
```

---

## Frontend Deployment (Vercel)

### 1. Prepare for Deployment

Ensure `next.config.ts` has static export:
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
```

Build locally to test:
```powershell
cd frontend
pnpm build
# Verify /out directory is created
```

### 2. Deploy to Vercel

**Via CLI:**
```powershell
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Production deploy
vercel --prod
```

**Via GitHub Integration:**
1. Push code to GitHub
2. Go to vercel.com → Import Project
3. Connect GitHub repo
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `frontend` (if monorepo)
   - Build Command: `pnpm build`
   - Output Directory: `out`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
6. Deploy

### 3. Custom Domain

1. Go to Vercel Project → Settings → Domains
2. Add your domain (e.g., `dashboard.rt-cx.com`)
3. Update DNS records per Vercel instructions
4. SSL auto-provisioned via Let's Encrypt

---

## Backend Deployment (Railway)

### 1. Prepare Backend

Add `Dockerfile` to backend:
```dockerfile
FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### 2. Deploy to Railway

**Via CLI:**
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Link to project (or create new)
railway link

# Deploy
railway up
```

**Via GitHub:**
1. Go to railway.app → New Project → Deploy from GitHub
2. Select `rt-cx-platform` repo
3. Configure:
   - Root Directory: `backend` (if monorepo)
   - Build Command: Auto-detected (Docker)
4. Add services:
   - Add PostgreSQL database
   - Add Redis
5. Set Environment Variables:
   - `DATABASE_URL`: ${{Postgres.DATABASE_URL}} (auto-injected)
   - `REDIS_URL`: ${{Redis.REDIS_URL}} (auto-injected)
   - `JWT_SECRET`: (generate secure secret)
   - `FRONTEND_URL`: https://dashboard.rt-cx.com
6. Deploy

### 3. Run Migrations

Railway auto-runs migrations via Dockerfile CMD. To manually run:
```powershell
railway run npx prisma migrate deploy
```

### 4. Custom Domain

1. Railway Project → Settings → Domain
2. Add custom domain: `api.rt-cx.com`
3. Update DNS with provided CNAME
4. SSL auto-provisioned

---

## Alternative: Fly.io

### 1. Install Fly CLI

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Launch App

```powershell
cd backend
fly launch

# Follow prompts:
# - App name: rtcx-backend
# - Region: choose closest to users
# - Postgres: yes
# - Redis: yes (via Upstash)
```

Creates `fly.toml`:
```toml
app = "rtcx-backend"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[[services]]
  internal_port = 4000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### 3. Set Secrets

```powershell
fly secrets set JWT_SECRET=your-secret-here
fly secrets set FRONTEND_URL=https://dashboard.rt-cx.com
```

### 4. Deploy

```powershell
fly deploy
```

### 5. Scale

```powershell
# Scale to 2 instances
fly scale count 2

# Scale VM size
fly scale vm shared-cpu-2x
```

---

## Database Deployment

### Railway Postgres (Recommended)

1. Railway Project → Add Service → PostgreSQL
2. Auto-injects `DATABASE_URL` env var
3. Backups: automatic daily backups

### AWS RDS (Production)

1. Create RDS PostgreSQL instance
2. Enable automated backups
3. Use connection pooling (RDS Proxy or PgBouncer)
4. Set `DATABASE_URL` in Railway/Fly

---

## Redis Deployment

### Railway Redis

1. Railway Project → Add Service → Redis
2. Auto-injects `REDIS_URL`

### Upstash (Serverless Redis)

1. Go to upstash.com → Create database
2. Copy REST URL
3. Set `REDIS_URL` env var

---

## File Storage (S3)

### AWS S3 Setup

```powershell
# Install AWS CLI
winget install Amazon.AWSCLI

# Configure
aws configure
# Enter: Access Key ID, Secret, Region, Output format

# Create bucket
aws s3 mb s3://rtcx-uploads --region us-east-1

# Enable CORS
aws s3api put-bucket-cors --bucket rtcx-uploads --cors-configuration file://cors.json
```

`cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://dashboard.rt-cx.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Set environment variables in backend:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=rtcx-uploads
```

---

## Environment Variables (Production)

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://api.rt-cx.com/api
NEXT_PUBLIC_SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

### Backend (Railway/Fly)
```
NODE_ENV=production
DATABASE_URL=postgresql://... (auto-injected)
REDIS_URL=redis://... (auto-injected)
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://dashboard.rt-cx.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=rtcx-uploads
SENTRY_DSN=...
```

---

## CI/CD Integration

### GitHub Actions (Auto Deploy)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --filter frontend
      
      - name: Build
        run: pnpm --filter frontend build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

---

## Health Checks & Monitoring

### Backend Health Endpoint

Already implemented in `src/app.ts`:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Uptime Monitoring

Use UptimeRobot, Pingdom, or Better Stack:
1. Add monitor for `https://api.rt-cx.com/health`
2. Set check interval (1-5 minutes)
3. Configure alerts (email, Slack)

---

## SSL/TLS

All platforms auto-provision SSL:
- **Vercel**: Let's Encrypt (automatic)
- **Railway**: Let's Encrypt (automatic)
- **Fly**: Let's Encrypt (automatic)

No manual setup required.

---

## Scaling

### Horizontal Scaling

**Railway:**
```
Project → Settings → Replicas → Set to 2+
```

**Fly:**
```powershell
fly scale count 3
```

**Vercel:**
Automatic, serverless (no config needed)

### Database Scaling

- **Read replicas**: Add read replica for heavy read workloads
- **Connection pooling**: Use PgBouncer or RDS Proxy
- **Indexes**: Optimize slow queries with indexes

---

## Rollback Strategy

### Railway
1. Go to Deployments
2. Click previous deployment
3. Click "Redeploy"

### Vercel
1. Go to Deployments
2. Click previous deployment
3. Click "Promote to Production"

### Fly
```powershell
fly releases
fly releases rollback <version>
```

---

## Cost Estimation (Monthly)

### Small Scale (MVP)
- **Vercel**: Free (Hobby) or $20/month (Pro)
- **Railway**: ~$5-20 (usage-based: 500 GB-hours + DB)
- **Database**: Included in Railway or ~$7 (Railway Postgres)
- **Redis**: Included in Railway or $0.20 (Upstash free tier)
- **S3**: ~$5-10 (100 GB storage + transfers)
- **Total**: ~$12-57/month

### Medium Scale (Production)
- **Vercel**: $20/month (Pro)
- **Railway**: ~$50-100
- **AWS RDS**: ~$50-100 (db.t3.small + backups)
- **ElastiCache**: ~$15-30
- **S3**: ~$20-50
- **Total**: ~$155-300/month

---

## Next Steps
- [CI/CD Pipeline](./ci-cd.md) - Automate testing and deployment
- [Observability](../observability-and-monitoring.md) - Set up Sentry and monitoring
- [Migration Path](./migration-path.md) - Move from full-stack to separated
