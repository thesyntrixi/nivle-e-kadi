// lib/staff-auth.ts
import { NextRequest } from 'next/server';
import { verifyToken, UserRole } from './token';

export type AuthUser = {
  userId: string;
  role: UserRole;
};

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return decoded;
}

export function requireAuth(request: NextRequest): AuthUser | { error: string; status: number } {
  const user = getAuthUser(request);
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  return user;
}

export function requireAdmin(user: AuthUser): { error: string; status: number } | null {
  if (user.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }
  return null;
}

export function requireStaff(user: AuthUser): { error: string; status: number } | null {
  if (user.role !== 'check-in-staff') {
    return { error: 'Staff access required', status: 403 };
  }
  return null;
}
