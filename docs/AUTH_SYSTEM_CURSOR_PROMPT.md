# 🔐 NIVLE E-Kadi - Authentication System Prompt for Cursor AI

**Copy ENTIRE prompt and paste into Cursor AI chat**

---

## INSTRUCTIONS FOR CURSOR AI - BUILD AUTHENTICATION

You are building the authentication layer for NIVLE E-Kadi. This includes:
1. Login page (email/password form)
2. Authentication API route
3. JWT token management
4. Protected routes
5. Logout functionality
6. Session persistence

### CONSTRAINTS
- Only work inside K:\nivle-e-kadi\
- Use TypeScript strictly
- Use Tailwind CSS (no inline styles)
- Use JWT tokens (stored in httpOnly cookies)
- Admin credentials: email: nivledesigns@gmailcom, password: Kelvin2026

---

## STEP 1: Create Authentication Library

Create `lib/auth.ts`:

```typescript
// lib/auth.ts
import { compare, hash } from 'bcryptjs';
import { query } from './db';
import { User } from './database/types';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);
  
  if (!isPasswordValid) {
    return null;
  }

  return user;
}

export function generateToken(userId: string): string {
  // Simple JWT-like token (userId + timestamp)
  // In production, use jsonwebtoken package
  const payload = {
    userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (payload.exp < Date.now()) {
      return null; // Token expired
    }
    
    return { userId: payload.userId };
  } catch (error) {
    return null;
  }
}
```

---

## STEP 2: Create Login API Route

Create `app/api/auth/login/route.ts`:

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user.id);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email
          }
        }
      },
      { status: 200 }
    );

    // Set httpOnly cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## STEP 3: Create Logout API Route

Create `app/api/auth/logout/route.ts`:

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Clear auth cookie
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    maxAge: 0
  });

  return response;
}
```

---

## STEP 4: Create Auth Middleware

Create `lib/middleware.ts`:

```typescript
// lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export function withAuth(handler: Function) {
  return async (request: NextRequest) => {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Add userId to request for API routes to use
    const newRequest = request.clone();
    (newRequest as any).userId = decoded.userId;

    return handler(newRequest);
  };
}
```

---

## STEP 5: Create Login Page

Create `app/(auth)/login/page.tsx`:

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        return;
      }

      // Login successful, redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">NIVLE E-Kadi</h1>
          <p className="text-gray-400">Invitation Management Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Admin Login</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nivelekadi.com"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Test Credentials */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-gray-300">
            <p className="font-medium text-blue-400 mb-2">Test Credentials:</p>
            <p>Email: <code className="text-gray-200">nivledesigns@gmailcom</code></p>
            <p>Password: <code className="text-gray-200">Kelvin2026</code></p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          <p>NIVLE E-Kadi © 2026</p>
        </div>
      </div>
    </div>
  );
}
```

---

## STEP 6: Create Auth Layout

Create `app/(auth)/layout.tsx`:

```typescript
// app/(auth)/layout.tsx
export const metadata = {
  title: 'Login - NIVLE E-Kadi',
  description: 'Admin login for NIVLE E-Kadi invitation system'
};

export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

---

## STEP 7: Create Dashboard Redirect

Create `app/page.tsx`:

```typescript
// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login or dashboard based on auth status
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
```

---

## STEP 8: Create Dashboard Layout

Create `app/(dashboard)/layout.tsx`:

```typescript
// app/(dashboard)/layout.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">NIVLE E-Kadi</h1>
        </div>

        <nav className="px-4 space-y-2">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/dashboard/clients" label="Clients" />
          <NavLink href="/dashboard/events" label="Events" />
          <NavLink href="/dashboard/cards" label="Cards" />
          <NavLink href="/dashboard/guests" label="Guests" />
          <NavLink href="/dashboard/reports" label="Reports" />
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors"
    >
      {label}
    </Link>
  );
}
```

---

## STEP 9: Create Dashboard Home Page

Create `app/(dashboard)/page.tsx`:

```typescript
// app/(dashboard)/page.tsx
'use client';

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Welcome to NIVLE E-Kadi</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <StatCard
          title="Total Clients"
          value="0"
          color="blue"
        />
        <StatCard
          title="Total Events"
          value="0"
          color="green"
        />
        <StatCard
          title="Total Guests"
          value="0"
          color="purple"
        />
        <StatCard
          title="Messages Sent"
          value="0"
          color="orange"
        />
      </div>

      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
        <ul className="space-y-2 text-gray-300">
          <li>✓ Go to Clients to add your first client</li>
          <li>✓ Create an event for the client</li>
          <li>✓ Upload invitation card design</li>
          <li>✓ Upload guest list (Excel)</li>
          <li>✓ Send invitations via WhatsApp</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const bgColor = {
    blue: 'bg-blue-500/20 border-blue-500',
    green: 'bg-green-500/20 border-green-500',
    purple: 'bg-purple-500/20 border-purple-500',
    orange: 'bg-orange-500/20 border-orange-500'
  }[color];

  return (
    <div className={`${bgColor} border rounded-lg p-4`}>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
```

---

## STEP 10: Update Global Styles

Add to `styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #111827;
  color: #f3f4f6;
}
```

---

## SUMMARY

You have now created:

✅ **lib/auth.ts** - Authentication logic  
✅ **app/api/auth/login/route.ts** - Login API  
✅ **app/api/auth/logout/route.ts** - Logout API  
✅ **lib/middleware.ts** - Auth protection  
✅ **app/(auth)/login/page.tsx** - Login page  
✅ **app/(auth)/layout.tsx** - Auth layout  
✅ **app/page.tsx** - Redirect logic  
✅ **app/(dashboard)/layout.tsx** - Dashboard layout  
✅ **app/(dashboard)/page.tsx** - Dashboard home  

---

## NEXT STEPS

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Login with:
   - Email: `nivledesigns@gmailcom`
   - Password: `Kelvin2026`
4. You should see dashboard!

---

Done! 🔐
