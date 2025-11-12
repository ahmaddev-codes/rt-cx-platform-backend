# Migration Path

## When to Migrate

### From Full-Stack Next.js → Separated Architecture

**Migrate when you experience:**
- Need for a public API consumed by mobile apps or partners
- Backend workloads exceed serverless limits (10-60 second timeouts)
- Team is growing and you want FE/BE separation of concerns
- Need to add Python/Go services for ML or data processing
- Want independent deployment cadence for frontend and backend

### From Separated Architecture → Full-Stack Next.js

**Migrate when:**
- Mobile app or public API is no longer needed
- Team shrinks and maintaining two codebases is overhead
- Complexity of CORS, auth, and dual deployment isn't justified
- Serverless constraints are no longer an issue

---

## Strategy 1: Full-Stack Next.js → Separated (Recommended)

### Phase 1: Preparation (Week 1)

**Goal**: Organize code to make extraction easier

1. **Move API logic to services**
   - Extract business logic from Route Handlers to `src/lib/services/`
   - Keep Route Handlers thin (just call service functions)

   Before:
   ```typescript
   // src/app/api/users/route.ts
   export async function GET() {
     const users = await prisma.user.findMany(); // Direct DB call
     return NextResponse.json(users);
   }
   ```

   After:
   ```typescript
   // src/lib/services/users.service.ts
   export class UsersService {
     async getUsers() {
       return prisma.user.findMany();
     }
   }

   // src/app/api/users/route.ts
   import { usersService } from '@/lib/services/users.service';
   
   export async function GET() {
     const users = await usersService.getUsers();
     return NextResponse.json({ status: 'ok', data: users });
   }
   ```

2. **Standardize API responses**
   - Use consistent envelope: `{ status: 'ok', data }`
   - Extract types to `src/types/api.types.ts`

3. **Separate server-only code**
   - Move Prisma, secrets, server utils to `src/lib/server/`
   - Ensure frontend code in `src/components/` and `src/app/` doesn't import server code

### Phase 2: Extract Backend (Week 2-3)

**Goal**: Create standalone backend API

1. **Create backend directory**
   ```powershell
   mkdir backend
   cd backend
   pnpm init
   ```

2. **Copy server code**
   - Copy `prisma/` folder
   - Copy `src/lib/services/` → `backend/src/services/`
   - Copy `src/types/` → `backend/src/types/`

3. **Set up Express/Fastify**
   - Install Express, Prisma, dependencies
   - Create routes matching Next.js API routes:
     - `src/app/api/users/route.ts` → `backend/src/routes/users.routes.ts`

4. **Migrate Route Handlers to Express routes**

   Next.js Route Handler:
   ```typescript
   // src/app/api/users/route.ts
   export async function GET() {
     const users = await usersService.getUsers();
     return NextResponse.json({ status: 'ok', data: users });
   }
   ```

   Express route:
   ```typescript
   // backend/src/routes/users.routes.ts
   router.get('/', async (req, res) => {
     const users = await usersService.getUsers();
     res.json({ status: 'ok', data: users });
   });
   ```

5. **Test backend independently**
   ```powershell
   cd backend
   pnpm dev
   curl http://localhost:4000/api/users
   ```

### Phase 3: Update Frontend (Week 3-4)

**Goal**: Point Next.js to external backend

1. **Remove API routes**
   - Delete `src/app/api/` folder (keep for reference until fully migrated)

2. **Add API client**
   - Install axios or fetch wrapper
   - Create `src/lib/api.ts` with base URL pointing to backend

3. **Update data fetching**

   Before (Server Component):
   ```typescript
   // src/app/users/page.tsx
   import { prisma } from '@/lib/prisma';
   
   export default async function UsersPage() {
     const users = await prisma.user.findMany();
     return <UserList users={users} />;
   }
   ```

   After (Client Component + React Query):
   ```typescript
   'use client';
   import { useQuery } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   
   export default function UsersPage() {
     const { data } = useQuery({
       queryKey: ['users'],
       queryFn: async () => {
         const res = await api.get('/users');
         return res.data.data;
       },
     });
     return <UserList users={data} />;
   }
   ```

4. **Configure static export**
   - Update `next.config.ts` with `output: 'export'`
   - Test build: `pnpm build`

5. **Update environment variables**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

### Phase 4: Deploy Separately (Week 4)

1. **Deploy backend**
   - Deploy to Railway/Fly (see [Deployment Guide](./deployment.md))
   - Set up production DATABASE_URL, REDIS_URL

2. **Deploy frontend**
   - Deploy to Vercel with `NEXT_PUBLIC_API_URL=https://api.rt-cx.com/api`

3. **Configure CORS**
   - Add frontend URL to backend CORS whitelist

4. **Test end-to-end**
   - Verify all API calls work
   - Check auth flow (login, token refresh)

### Phase 5: Cleanup (Week 5)

1. **Remove unused Next.js backend code**
   - Delete old API routes if fully migrated
   - Remove Prisma from frontend dependencies

2. **Update documentation**
   - Update README with new setup instructions
   - Document API endpoints

---

## Strategy 2: Separated → Full-Stack Next.js (Merge Back)

### Phase 1: Add Next.js API Routes

1. **Create Route Handlers** in `src/app/api/`
2. **Copy backend logic** to Route Handlers
3. **Add Prisma** to Next.js dependencies
4. **Dual-run**: Keep backend running while testing Next.js routes

### Phase 2: Migrate Frontend to Server Components

1. **Remove API client** (axios)
2. **Convert client components** to Server Components where possible
3. **Fetch directly from DB** in Server Components:
   ```typescript
   // src/app/users/page.tsx
   import { prisma } from '@/lib/prisma';
   
   export default async function UsersPage() {
     const users = await prisma.user.findMany();
     return <UserList users={users} />;
   }
   ```

### Phase 3: Decommission Backend

1. **Remove `NEXT_PUBLIC_API_URL`** from frontend
2. **Shut down backend** service
3. **Migrate database** (if hosted separately, keep it)

---

## Gradual Migration (Strangler Fig Pattern)

Instead of big-bang migration, gradually move endpoints:

### Week 1: Move `/api/auth` to backend
- Deploy backend with only auth routes
- Frontend calls backend for auth, still uses Next.js for other APIs

### Week 2: Move `/api/users` to backend
- Add users routes to backend
- Update frontend to call backend for users

### Week 3-N: Repeat for remaining endpoints

**Advantages:**
- Lower risk (one endpoint at a time)
- Can rollback individual migrations
- Frontend and backend evolve in parallel

**Configuration:**
```typescript
// src/lib/api.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const NEXTJS_API_URL = '/api';

export const api = {
  auth: axios.create({ baseURL: BACKEND_URL }), // Migrated
  users: axios.create({ baseURL: BACKEND_URL }), // Migrated
  posts: axios.create({ baseURL: NEXTJS_API_URL }), // Not migrated yet
};
```

---

## Type Safety During Migration

### Option 1: Shared Types Package (Monorepo)

```
rt-cx-platform/
├── packages/
│   └── types/
│       ├── package.json
│       └── src/
│           └── api.types.ts
├── backend/
│   └── package.json (depends on @rtcx/types)
├── frontend/
│   └── package.json (depends on @rtcx/types)
```

### Option 2: OpenAPI Codegen

1. **Backend** generates OpenAPI spec
2. **CI** runs codegen to create frontend types
3. **Frontend** imports generated types

```powershell
# In CI or pre-build
npx openapi-typescript http://localhost:4000/api-docs -o frontend/src/types/api.types.ts
```

### Option 3: tRPC (if staying in TypeScript monorepo)

Migrate to tRPC for end-to-end type safety without codegen.

---

## Rollback Plan

### If Migration Fails

1. **Keep old Next.js API routes** until backend is proven stable
2. **Use feature flags** to toggle between Next.js and backend APIs:
   ```typescript
   const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND_API === 'true';
   const apiUrl = USE_BACKEND ? BACKEND_URL : '/api';
   ```
3. **Monitor errors** (Sentry) during migration
4. **Rollback**: Set `NEXT_PUBLIC_USE_BACKEND_API=false` and redeploy

---

## Checklist

### Pre-Migration
- [ ] Business logic extracted to services
- [ ] API responses standardized
- [ ] Server/client code separated
- [ ] Types shared or documented

### Backend Setup
- [ ] Express/Fastify app created
- [ ] All routes migrated
- [ ] Prisma migrations match Next.js DB
- [ ] Auth flow tested (JWT, sessions)
- [ ] CORS configured
- [ ] Health checks added

### Frontend Update
- [ ] API client configured
- [ ] Environment variables set
- [ ] Data fetching migrated (React Query or SWR)
- [ ] Auth token storage (localStorage/cookies)
- [ ] Static export configured

### Deployment
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and calls backend
- [ ] Database backups enabled
- [ ] Monitoring and logging configured
- [ ] Error tracking (Sentry) live

### Post-Migration
- [ ] Old API routes removed
- [ ] Documentation updated
- [ ] Team trained on new architecture
- [ ] Performance benchmarked

---

## Timeline Estimate

| Phase | Duration | Parallel Work Possible? |
|-------|----------|------------------------|
| Preparation | 1 week | No (refactor existing code) |
| Backend extraction | 1-2 weeks | Partly (backend dev while frontend continues) |
| Frontend migration | 1-2 weeks | Partly (update one page at a time) |
| Deployment & testing | 1 week | No (critical path) |
| Cleanup | 1 week | Yes (can overlap with new features) |
| **Total** | **5-7 weeks** | With 2-3 devs, can compress to 4 weeks |

---

## Next Steps
- [Local Development](./local-development.md) - Set up both FE and BE locally
- [Testing Strategy](./testing.md) - Test during migration
- [CI/CD](./ci-cd.md) - Automate testing for both repos
