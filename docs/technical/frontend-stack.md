# Frontend Stack & Setup

## Technology Choices

### Next.js Configuration for Separated Architecture

When separating frontend and backend, configure Next.js as:

#### Option 1: Static Export (Recommended for simplicity)
- Build Next.js as static HTML/CSS/JS
- No Node.js server required
- Deploy to CDN (Vercel, Netlify, S3 + CloudFront)
- All API calls go to external backend
- **Use when**: Simple routing, no SSR needed

#### Option 2: SPA Mode (Client-Side Rendering)
- Next.js with client-side data fetching only
- Disable server components, use client components
- All rendering happens in browser
- **Use when**: You want React Router-like behavior in Next.js

#### Option 3: Hybrid (SSR + External API)
- Keep Next.js server for SSR/ISR
- Server components fetch from external backend API
- More complex but better SEO and performance
- **Use when**: Need SEO, initial load speed critical

**Recommendation for rt-cx-platform**: Start with **Static Export** for simplicity; upgrade to Hybrid if SEO becomes critical.

---

## Stack Components

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14+ | React framework |
| **Language** | TypeScript | Type safety |
| **UI Library** | React 18+ | Component library |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **State** | Zustand / Jotai | Client state |
| **Data Fetching** | TanStack Query | API client + cache |
| **Forms** | React Hook Form + Zod | Form handling |
| **Auth** | Custom hooks + JWT | Token management |
| **Testing** | Vitest + Playwright | Unit + E2E tests |
| **Charts** | Recharts / D3.js | Data visualization |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # shadcn/ui or custom primitives
│   │   ├── forms/
│   │   └── charts/
│   ├── lib/                    # Client-side utilities
│   │   ├── api.ts              # API client wrapper
│   │   ├── auth.ts             # Auth helpers
│   │   └── utils.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useUser.ts
│   ├── stores/                 # Zustand stores
│   │   └── authStore.ts
│   ├── types/                  # TypeScript types
│   │   └── api.types.ts        # Shared with backend or generated
│   └── styles/
│       └── globals.css
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.local
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup Instructions (PowerShell)

### 1. Configure Next.js for Static Export

Edit `next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
```

### 2. Install Dependencies

```powershell
# From project root
pnpm add @tanstack/react-query axios zod
pnpm add zustand react-hook-form @hookform/resolvers
pnpm add recharts date-fns
pnpm add -D @types/node
```

### 3. Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Create `src/lib/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
```

### 4. API Client Setup

Create `src/lib/api.ts`:
```typescript
import axios, { AxiosError } from 'axios';
import { env } from './env';

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 5. React Query Setup

Create `src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Update `src/app/layout.tsx`:
```typescript
import { Providers } from './providers';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 6. Authentication Hooks

Create `src/hooks/useAuth.ts`:
```typescript
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  status: 'ok';
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await api.post<AuthResponse>('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.data.token);
      queryClient.setQueryData(['user'], data.data.user);
      router.push('/dashboard');
    },
  });

  const logout = () => {
    localStorage.removeItem('token');
    queryClient.clear();
    router.push('/login');
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
    enabled: !!localStorage.getItem('token'),
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
```

### 7. Example Login Page

Create `src/app/login/page.tsx`:
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    login.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>
        
        <div>
          <label htmlFor="email">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full border p-2 rounded"
          />
          {errors.email && <p className="text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            {...register('password')}
            type="password"
            className="w-full border p-2 rounded"
          />
          {errors.password && <p className="text-red-500">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {login.isPending ? 'Logging in...' : 'Login'}
        </button>

        {login.isError && (
          <p className="text-red-500">Login failed. Please try again.</p>
        )}
      </form>
    </div>
  );
}
```

### 8. Example Dashboard Page

Create `src/app/dashboard/page.tsx`:
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Stats cards */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-gray-500">Total Users</h3>
          <p className="text-3xl font-bold">{data?.totalUsers || 0}</p>
        </div>
        {/* Add more stats */}
      </div>
    </div>
  );
}
```

---

## Build & Deploy

### Local Development
```powershell
pnpm dev
```

### Build for Production
```powershell
pnpm build
# Creates /out directory with static files
```

### Deploy to Vercel
```powershell
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

Vercel will auto-detect static export and deploy to CDN.

### Deploy to Netlify
```powershell
# Install Netlify CLI
pnpm add -g netlify-cli

# Build and deploy
pnpm build
netlify deploy --prod --dir=out
```

---

## Type Safety Between Frontend & Backend

### Option 1: Manual Type Sharing
- Copy types from backend `src/types/api.types.ts` to frontend
- Maintain manually or via npm workspace

### Option 2: OpenAPI Codegen
- Generate TypeScript types from OpenAPI spec
```powershell
pnpm add -D openapi-typescript
npx openapi-typescript http://localhost:4000/api-docs -o src/types/api.types.ts
```

### Option 3: tRPC (Recommended for TypeScript monorepo)
- Share types automatically between frontend and backend
- Requires both to be TypeScript and same repo or workspace

---

## Testing

### Unit Tests (Vitest)
```typescript
// tests/unit/useAuth.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());
    // Add test logic
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Next Steps
- [API Design & Contracts](./api-contracts.md) - Define API endpoints
- [Authentication](./authentication.md) - JWT flow, token refresh
- [Real-time & WebSockets](./realtime.md) - Live updates
