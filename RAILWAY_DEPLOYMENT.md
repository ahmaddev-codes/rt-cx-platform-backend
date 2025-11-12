# 🚀 Railway Deployment Guide - RT-CX Platform Backend

## Quick Start (15 minutes)

### Prerequisites

- GitHub account
- Railway account (free tier)
- Hugging Face API key

---

## Step 1: Prepare Your Repository

### 1.1 Update Environment Variables

Ensure your `.env` file has the Hugging Face API key:

```bash
HUGGINGFACE_API_KEY=hf_your_actual_api_key_here
FRONTEND_URL=http://localhost:3000,http://localhost:5173
```

### 1.2 Commit and Push

```bash
git add .
git commit -m "feat: add demo endpoints and production-ready configs"
git push origin dev
```

---

## Step 2: Deploy to Railway

### 2.1 Sign Up

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub

### 2.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `rt-cx-platform-backend` repository
4. Select `dev` branch

### 2.3 Add PostgreSQL

1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway auto-provisions and injects `DATABASE_URL`

### 2.4 Add Redis

1. Click "New" again
2. Select "Database" → "Redis"
3. Railway auto-injects `REDIS_URL`

### 2.5 Configure Environment Variables

In your backend service settings, add these variables:

#### Required Variables:

```bash
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-frontend.vercel.app,http://localhost:3000
JWT_SECRET=<generate-secure-32-char-string>
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx
```

#### Auto-Injected by Railway:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

#### Optional:

```bash
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.6 Generate Secure JWT Secret

```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or use online tool: https://generate-secret.vercel.app/32
```

---

## Step 3: Configure Build & Start Commands

Railway auto-detects settings, but verify:

### Build Command:

```bash
pnpm install && pnpm db:generate && pnpm build
```

### Start Command:

```bash
node dist/server.js
```

### Healthcheck Path:

```
/health
```

---

## Step 4: Run Database Migrations

### 4.1 Use Railway CLI (Recommended)

Install Railway CLI:

```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh
```

Link to your project:

```bash
railway login
railway link
```

Run migrations:

```bash
railway run pnpm db:migrate
```

Seed initial data:

```bash
railway run pnpm db:seed
```

### 4.2 Alternative: Railway Dashboard

1. Go to your backend service
2. Click "Settings" → "Deployments"
3. Find latest deployment → "View Logs"
4. Click "..." → "Run Command"
5. Enter: `pnpm db:migrate`
6. Then: `pnpm db:seed`

---

## Step 5: Configure Domain

### 5.1 Get Railway Domain

1. In backend service, click "Settings"
2. Under "Networking", click "Generate Domain"
3. You'll get: `rt-cx-backend-production.up.railway.app`

### 5.2 Update Frontend URL

Add Railway domain to `FRONTEND_URL`:

```bash
FRONTEND_URL=https://your-frontend.vercel.app,https://rt-cx-backend-production.up.railway.app
```

---

## Step 6: Verify Deployment

### 6.1 Check Health Endpoint

```bash
curl https://your-railway-domain.up.railway.app/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T...",
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "websocket": "active",
    "workers": "running"
  }
}
```

### 6.2 Check API Documentation

```
https://your-railway-domain.up.railway.app/api-docs
```

### 6.3 Test WebSocket

Use a WebSocket client:

```
wss://your-railway-domain.up.railway.app
```

---

## Step 7: Create Admin User

Use Railway CLI or dashboard to run:

```bash
railway run pnpm tsx -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin();
"
```

---

## Step 8: Test Demo Endpoints

### 8.1 Login as Admin

```bash
curl -X POST https://your-railway-domain.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Admin@123"
  }'
```

Save the `accessToken` from response.

### 8.2 Seed Demo Data

```bash
curl -X POST https://your-railway-domain.up.railway.app/api/v1/admin/seed-demo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "count": 50,
    "organizationId": "bank-a"
  }'
```

### 8.3 Get Demo Stats

```bash
curl https://your-railway-domain.up.railway.app/api/v1/admin/demo-stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Production Configuration

### Environment Variables Checklist:

- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL` (auto-injected)
- ✅ `REDIS_URL` (auto-injected)
- ✅ `FRONTEND_URL` (with all allowed origins)
- ✅ `JWT_SECRET` (32+ characters, secure)
- ✅ `HUGGINGFACE_API_KEY` (from HuggingFace)

### Optional for Production:

```bash
# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_FROM=alerts@yourapp.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## Monitoring & Logs

### View Logs:

1. Railway Dashboard → Your Service → "Deployments"
2. Click on active deployment
3. View real-time logs

### Key Log Patterns:

```bash
# Successful startup
✅ Database connected
✅ Redis connected
✅ Background workers initialized
✅ NLP models warmed up
🚀 Server running on port 4000

# Sentiment analysis
Processing sentiment analysis job for feedback: cxyz...
Sentiment analysis completed: VERY_NEGATIVE

# Alerts triggered
Created sentiment alert: SENTIMENT_SPIKE
```

---

## Troubleshooting

### Issue: Database Migration Fails

**Solution:**

```bash
railway run prisma migrate reset --force
railway run pnpm db:seed
```

### Issue: WebSocket Not Connecting

**Check:**

1. `FRONTEND_URL` includes frontend domain
2. Railway service has public domain generated
3. Firewall allows WebSocket connections

### Issue: Sentiment Analysis Not Working

**Check:**

1. `HUGGINGFACE_API_KEY` is set correctly
2. Redis is connected (check `/health` endpoint)
3. Worker logs show jobs processing

### Issue: CORS Errors

**Check:**

1. `FRONTEND_URL` has correct frontend domain
2. No trailing slashes in URL
3. Include both `http://localhost:3000` and production URL

---

## Cost Estimates

### Free Tier (Hackathon):

- Railway: $5 credit/month
- PostgreSQL: Included
- Redis: Included
- Bandwidth: 100GB/month
- **Total: $0** (under free tier limits)

### After Free Credits:

- Railway Starter: $5/month
- PostgreSQL: Included
- Redis: Included
- **Total: $5/month**

### Production Scaling:

- Railway Pro: $20/month (more resources)
- Hugging Face Pro: $9/month (30K requests/month)
- **Total: $29/month**

---

## Next Steps

### 1. Deploy Frontend

- Deploy to Vercel/Netlify
- Set `VITE_API_URL` to Railway domain
- Test end-to-end connection

### 2. Configure WebSocket

- Update frontend to use Railway WebSocket URL
- Test real-time updates

### 3. Load Demo Data

- Run `/api/v1/admin/seed-demo` with 50+ items
- Verify sentiment analysis runs
- Check alerts trigger correctly

### 4. Prepare for Hackathon

- Generate QR codes pointing to feedback portal
- Practice demo flow
- Have backup localhost setup ready

---

## Hackathon Day Checklist

### 3 Hours Before:

- [ ] Backend deployed and healthy
- [ ] Database seeded with demo data
- [ ] Admin user created and tested
- [ ] Frontend connected and tested
- [ ] WebSocket working end-to-end

### 1 Hour Before:

- [ ] Clear demo data: `POST /api/v1/admin/reset-demo`
- [ ] Fresh seed: `POST /api/v1/admin/seed-demo`
- [ ] Test alert triggers
- [ ] Verify sentiment analysis running

### 10 Minutes Before:

- [ ] Check `/health` returns 200
- [ ] Railway dashboard open (show live metrics)
- [ ] QR codes ready
- [ ] Backup localhost running

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **API Docs**: https://your-domain.up.railway.app/api-docs
- **Hugging Face Status**: https://status.huggingface.co

---

## Quick Commands Reference

```bash
# View logs
railway logs

# Run migrations
railway run pnpm db:migrate

# Seed data
railway run pnpm db:seed

# SSH into container
railway shell

# Check environment
railway variables

# Restart service
railway up --detach
```

---

**Your backend is now production-ready! 🚀**

Next: Deploy your frontend and connect it to this Railway backend URL.
