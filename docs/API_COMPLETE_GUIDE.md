# RT-CX Platform - Complete API & Integration Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions Matrix](#user-roles--permissions-matrix)
3. [Authentication & Authorization](#authentication--authorization)
4. [Complete API Endpoints Reference](#complete-api-endpoints-reference)
5. [WebSocket Real-Time Integration](#websocket-real-time-integration)
6. [Frontend Implementation Examples](#frontend-implementation-examples)
7. [Error Handling & Status Codes](#error-handling--status-codes)
8. [Rate Limiting](#rate-limiting)
9. [Demo & Testing](#demo--testing)

---

## 🏗️ System Overview

### Base URLs

- **Development:** `http://localhost:4000`
- **Production:** `https://rt-cx-platform-backend-production.up.railway.app`
- **API Base Path:** `/api/v1`
- **WebSocket:** Same as base URL (Socket.IO)
- **API Docs:** `/api-docs` (Swagger UI)

### Technology Stack

- **Express.js** - REST API framework
- **Socket.IO** - WebSocket real-time communication
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching & job queue
- **BullMQ** - Background job processing
- **JWT** - Token-based authentication
- **Zod** - Request validation
- **Hugging Face** - NLP/Sentiment analysis

---

## 👥 User Roles & Permissions Matrix

### Role Hierarchy

```
ADMIN (Level 4) > MANAGER (Level 3) > AGENT (Level 2) > API_USER (Level 1)
```

### Permission Matrix

| Operation                   | ADMIN | MANAGER      | AGENT | API_USER |
| --------------------------- | ----- | ------------ | ----- | -------- |
| **Authentication**          |
| Register (self)             | ✅    | ✅           | ✅    | ✅       |
| Login                       | ✅    | ✅           | ✅    | ✅       |
| Logout                      | ✅    | ✅           | ✅    | ✅       |
| Change own password         | ✅    | ✅           | ✅    | ✅       |
| View own profile            | ✅    | ✅           | ✅    | ✅       |
| **User Management**         |
| Create users                | ✅    | ❌           | ❌    | ❌       |
| View all users              | ✅    | ✅           | ❌    | ❌       |
| Update users                | ✅    | ✅ (limited) | ❌    | ❌       |
| Delete users                | ✅    | ❌           | ❌    | ❌       |
| Toggle user status          | ✅    | ❌           | ❌    | ❌       |
| **Feedback**                |
| Submit feedback (anonymous) | ✅    | ✅           | ✅    | ✅       |
| View all feedback           | ✅    | ✅           | ❌    | ✅       |
| View own feedback           | ✅    | ✅           | ✅    | ✅       |
| Bulk create feedback        | ✅    | ✅           | ❌    | ✅       |
| View channel stats          | ✅    | ✅           | ❌    | ❌       |
| **Dashboard**               |
| View overall stats          | ✅    | ✅           | ❌    | ❌       |
| View sentiment trends       | ✅    | ✅           | ❌    | ❌       |
| View channel performance    | ✅    | ✅           | ❌    | ❌       |
| View trending topics        | ✅    | ✅           | ❌    | ❌       |
| View emotion breakdown      | ✅    | ✅           | ❌    | ❌       |
| View customer segments      | ✅    | ✅           | ❌    | ❌       |
| View journey stages         | ✅    | ✅           | ❌    | ❌       |
| **Alerts**                  |
| View all alerts             | ✅    | ✅           | ❌    | ❌       |
| View own alerts             | ✅    | ✅           | ✅    | ❌       |
| Create alerts               | ✅    | ❌           | ❌    | ❌       |
| Update alert status         | ✅    | ✅           | ❌    | ❌       |
| Assign alerts               | ✅    | ✅           | ❌    | ❌       |
| Resolve alerts              | ✅    | ✅           | ❌    | ❌       |
| Delete alerts               | ✅    | ❌           | ❌    | ❌       |
| **Topics**                  |
| View all topics             | ✅    | ✅           | ❌    | ❌       |
| Create topics               | ✅    | ✅           | ❌    | ❌       |
| Update topics               | ✅    | ✅           | ❌    | ❌       |
| Delete topics               | ✅    | ❌           | ❌    | ❌       |
| **Admin/Demo**              |
| Seed demo data              | ✅    | ❌           | ❌    | ❌       |
| Reset demo data             | ✅    | ❌           | ❌    | ❌       |
| View demo stats             | ✅    | ❌           | ❌    | ❌       |
| Trigger demo alerts         | ✅    | ❌           | ❌    | ❌       |

---

## 🔐 Authentication & Authorization

### Token-Based Authentication (JWT)

The platform uses JWT (JSON Web Tokens) for authentication:

- **Access Token**: Short-lived (1 hour), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Authentication Flow Diagram

```
┌──────────┐                  ┌──────────┐                ┌──────────┐
│          │  1. Login        │          │  2. Validate   │          │
│  Client  │ ────────────────>│  Backend │────────────────>│ Database │
│          │                  │          │                │          │
│          │  3. Return Tokens│          │                │          │
│          │ <────────────────│          │                │          │
└──────────┘                  └──────────┘                └──────────┘
     │                             │
     │  4. API Request             │
     │  (with Access Token)        │
     │────────────────────────────>│
     │                             │
     │  5. Verify Token            │
     │                             │
     │  6. Return Data             │
     │<────────────────────────────│
```

### Frontend Authentication Implementation

```typescript
// auth.service.ts
import axios from "axios";

const API_URL = process.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = `${API_URL}/api/v1`;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
  role?: "ADMIN" | "MANAGER" | "AGENT" | "API_USER";
}

interface AuthResponse {
  status: string;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
    };
    accessToken: string;
    refreshToken: string;
  };
}

class AuthService {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE}/auth/register`, data);

    if (response.data.status === "success") {
      this.setTokens(response.data.data);
    }

    return response.data;
  }

  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);

    if (response.data.status === "success") {
      this.setTokens(response.data.data);
    }

    return response.data;
  }

  // Refresh access token
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem("refreshToken");

    const response = await axios.post(`${API_BASE}/auth/refresh`, {
      refreshToken,
    });

    if (response.data.status === "success") {
      this.setTokens(response.data.data);
    }

    return response.data;
  }

  // Logout
  async logout(): Promise<void> {
    const token = localStorage.getItem("accessToken");

    try {
      await axios.post(
        `${API_BASE}/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } finally {
      this.clearTokens();
    }
  }

  // Get current user
  async getCurrentUser() {
    const token = localStorage.getItem("accessToken");

    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data.user;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string) {
    const token = localStorage.getItem("accessToken");

    const response = await axios.post(
      `${API_BASE}/auth/change-password`,
      { currentPassword, newPassword },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data;
  }

  // Helper: Store tokens
  private setTokens(data: AuthResponse["data"]): void {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  // Helper: Clear tokens
  private clearTokens(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  // Helper: Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  }

  // Helper: Get current user from storage
  getCurrentUserFromStorage() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  // Helper: Check user role
  hasRole(role: string): boolean {
    const user = this.getCurrentUserFromStorage();
    return user?.role === role;
  }

  // Helper: Check if user has minimum role level
  hasMinimumRole(minRole: string): boolean {
    const roleHierarchy = {
      API_USER: 1,
      AGENT: 2,
      MANAGER: 3,
      ADMIN: 4,
    };

    const user = this.getCurrentUserFromStorage();
    const userLevel =
      roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0;
    const minLevel = roleHierarchy[minRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= minLevel;
  }
}

export const authService = new AuthService();
```

### Axios Interceptor for Automatic Token Refresh

```typescript
// api.config.ts
import axios from "axios";
import { authService } from "./auth.service";

const API_URL = process.env.VITE_API_URL || "http://localhost:4000";
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add access token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        await authService.refreshToken();

        // Retry original request with new token
        const token = localStorage.getItem("accessToken");
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        authService.logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### React Auth Context & Hook

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasMinimumRole: (minRole: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from storage on mount
    const storedUser = authService.getCurrentUserFromStorage();
    setUser(storedUser);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.data.user);
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    setUser(response.data.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const hasRole = (role: string) => {
    return user?.role === role;
  };

  const hasMinimumRole = (minRole: string) => {
    return authService.hasMinimumRole(minRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        hasRole,
        hasMinimumRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```typescript
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  minRole?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  minRole,
  allowedRoles
}) => {
  const { isAuthenticated, user, hasMinimumRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirements
  if (minRole && !hasMinimumRole(minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Usage in routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public feedback portal */}
          <Route path="/feedback" element={<PublicFeedbackPortal />} />

          {/* Protected routes - Any authenticated user */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Manager and above only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute minRole="MANAGER">
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## 📡 Complete API Endpoints Reference

### Health Check

#### GET `/health`

**Auth Required:** No

**Description:** Check system health and service status

**Frontend Example:**

```typescript
const checkHealth = async () => {
  const response = await fetch(`${API_URL}/health`);
  const data = await response.json();
  return data;
};
```

**Response (200 - Healthy):**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:00:00Z",
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

**Response (503 - Degraded):**

```json
{
  "status": "degraded",
  "timestamp": "2025-11-12T10:00:00Z",
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "disconnected",
    "websocket": "active",
    "workers": "stopped"
  }
}
```

---

### Authentication Endpoints (`/api/v1/auth`)

All authentication endpoints are documented in the [Authentication & Authorization](#authentication--authorization) section above.

---

### Feedback Endpoints (`/api/v1/feedback`)

#### 1. Submit Feedback (Public)

**POST** `/api/v1/feedback`

**Auth Required:** No (anonymous allowed)  
**Rate Limit:** 10 requests/minute

**Request Body:**

```json
{
  "channel": "IN_APP_SURVEY",
  "rating": 4,
  "comment": "Great mobile app experience!",
  "source": "mobile-app",
  "customerSegment": "VIP",
  "journeyStage": "Transaction",
  "metadata": {
    "organizationId": "bank-a",
    "transactionId": "TXN123456",
    "deviceType": "iOS",
    "appVersion": "2.1.0"
  }
}
```

**Available Channels:**

- `IN_APP_SURVEY` - In-app surveys
- `CHATBOT` - Chatbot conversations
- `VOICE_CALL` - Call center recordings
- `SOCIAL_MEDIA` - Social media mentions
- `EMAIL` - Email feedback
- `WEB_FORM` - Website forms
- `SMS` - SMS feedback

**Frontend Implementation:**

```typescript
interface FeedbackData {
  channel: 'IN_APP_SURVEY' | 'CHATBOT' | 'VOICE_CALL' | 'SOCIAL_MEDIA' | 'EMAIL' | 'WEB_FORM' | 'SMS';
  rating?: number; // 1-5
  comment?: string;
  source?: string;
  customerSegment?: string;
  journeyStage?: string;
  metadata?: {
    organizationId?: string;
    [key: string]: any;
  };
}

const submitFeedback = async (data: FeedbackData) => {
  const response = await fetch(`${API_URL}/api/v1/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to submit feedback');
  }

  return response.json();
};

// React component example
const FeedbackForm: React.FC = () => {
  const [formData, setFormData] = useState<FeedbackData>({
    channel: 'IN_APP_SURVEY',
    rating: 5,
    comment: '',
    metadata: {
      organizationId: 'bank-a'
    }
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitFeedback(formData);
      toast.success('Thank you for your feedback!');
      // Reset form or redirect
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Channel
        </label>
        <select
          value={formData.channel}
          onChange={(e) => setFormData({...formData, channel: e.target.value as any})}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="IN_APP_SURVEY">Mobile App</option>
          <option value="WEB_FORM">Website</option>
          <option value="CHATBOT">Chatbot</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Rating
        </label>
        <StarRating
          value={formData.rating || 5}
          onChange={(rating) => setFormData({...formData, rating})}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Comments
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({...formData, comment: e.target.value})}
          placeholder="Tell us about your experience..."
          className="w-full px-4 py-2 border rounded h-32"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};
```

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "feedback": {
      "id": "clxxx123",
      "userId": null,
      "channel": "IN_APP_SURVEY",
      "source": "mobile-app",
      "rating": 4,
      "comment": "Great mobile app experience!",
      "metadata": {
        "organizationId": "bank-a",
        "transactionId": "TXN123456"
      },
      "customerSegment": "VIP",
      "journeyStage": "Transaction",
      "processed": false,
      "createdAt": "2025-11-12T10:00:00.000Z",
      "updatedAt": "2025-11-12T10:00:00.000Z"
    }
  }
}
```

**Note:** After submission, the feedback is queued for sentiment analysis via BullMQ worker. Analysis results will be available within 3-5 seconds and can be received via WebSocket or by fetching the feedback again.

---

#### 2. Get All Feedback (With Filters)

**GET** `/api/v1/feedback`

**Auth Required:** Yes  
**Required Role:** MANAGER, ADMIN

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `channel` | string | Filter by channel | `IN_APP_SURVEY` |
| `sentiment` | string | Filter by sentiment | `POSITIVE`, `NEGATIVE` |
| `startDate` | ISO date | Start date range | `2025-11-01T00:00:00Z` |
| `endDate` | ISO date | End date range | `2025-11-12T23:59:59Z` |
| `customerSegment` | string | Filter by segment | `VIP`, `Regular` |
| `journeyStage` | string | Filter by stage | `Onboarding`, `Transaction` |
| `processed` | boolean | Filter by processing status | `true`, `false` |
| `page` | number | Page number (1-based) | `1` |
| `limit` | number | Items per page | `20` |

**Frontend Implementation:**

```typescript
interface FeedbackFilters {
  channel?: string;
  sentiment?: string;
  startDate?: string;
  endDate?: string;
  customerSegment?: string;
  journeyStage?: string;
  processed?: boolean;
  page?: number;
  limit?: number;
}

const getFeedback = async (filters: FeedbackFilters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await api.get(`/feedback?${params.toString()}`);
  return response.data;
};

// React component with filters
const FeedbackListPage: React.FC = () => {
  const [feedback, setFeedback] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState<FeedbackFilters>({
    channel: '',
    sentiment: '',
    page: 1,
    limit: 20
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [filters]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await getFeedback(filters);
      setFeedback(data.data.feedback);
      setPagination(data.data.pagination);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<FeedbackFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Feedback</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-4 gap-4">
          <select
            value={filters.channel || ''}
            onChange={(e) => handleFilterChange({ channel: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="">All Channels</option>
            <option value="IN_APP_SURVEY">In-App Survey</option>
            <option value="CHATBOT">Chatbot</option>
            <option value="WEB_FORM">Web Form</option>
            <option value="EMAIL">Email</option>
          </select>

          <select
            value={filters.sentiment || ''}
            onChange={(e) => handleFilterChange({ sentiment: e.target.value })}
            className="px-4 py-2 border rounded"
          >
            <option value="">All Sentiments</option>
            <option value="VERY_POSITIVE">Very Positive</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
            <option value="VERY_NEGATIVE">Very Negative</option>
          </select>

          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange({ startDate: e.target.value })}
            className="px-4 py-2 border rounded"
          />

          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange({ endDate: e.target.value })}
            className="px-4 py-2 border rounded"
          />
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded shadow">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Channel</th>
                  <th className="px-6 py-3 text-left">Rating</th>
                  <th className="px-6 py-3 text-left">Sentiment</th>
                  <th className="px-6 py-3 text-left">Comment</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {item.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.rating ? `${item.rating}/5` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {item.sentimentAnalysis && (
                        <SentimentBadge sentiment={item.sentimentAnalysis.sentiment} />
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      {item.comment}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewDetails(item.id)}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {feedback.length} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "feedback": [
      {
        "id": "clxxx123",
        "userId": null,
        "channel": "IN_APP_SURVEY",
        "source": "mobile-app",
        "rating": 4,
        "comment": "Great experience!",
        "metadata": {
          "organizationId": "bank-a"
        },
        "customerSegment": "VIP",
        "journeyStage": "Transaction",
        "processed": true,
        "createdAt": "2025-11-12T10:00:00.000Z",
        "updatedAt": "2025-11-12T10:05:00.000Z",
        "sentimentAnalysis": {
          "id": "clyyy456",
          "feedbackId": "clxxx123",
          "sentiment": "POSITIVE",
          "sentimentScore": 0.85,
          "confidence": 0.92,
          "emotions": {
            "joy": 0.85,
            "satisfaction": 0.65,
            "neutral": 0.15
          },
          "primaryEmotion": "JOY",
          "detectedLanguage": "en",
          "wordCount": 12,
          "keyPhrases": ["great", "experience", "mobile app"],
          "analyzedAt": "2025-11-12T10:00:05.000Z"
        },
        "topics": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

(Continued in next message due to length...)
