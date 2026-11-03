// lib/token.ts
// Signed session tokens (Node runtime)

import { createHmac, timingSafeEqual } from 'node:crypto';

export type UserRole = 'admin' | 'check-in-staff';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'check-in-staff';
}

function signPayload(payloadPart: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function generateToken(userId: string, role: UserRole = 'admin'): string {
  const secret = authSecret();
  if (!secret) {
    throw new Error('Authentication is not configured');
  }

  const payload = {
    userId,
    role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadPart}.${signPayload(payloadPart, secret)}`;
}

export function verifyToken(token: string): { userId: string; role: UserRole } | null {
  try {
    const secret = authSecret();
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadPart, signaturePart] = parts;
    if (!payloadPart || !signaturePart) return null;
    if (!signaturesMatch(signaturePart, signPayload(payloadPart, secret))) return null;

    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString()) as {
      userId?: unknown;
      role?: unknown;
      exp?: unknown;
    };

    if (typeof payload.userId !== 'string' || payload.userId.length === 0) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (!isUserRole(payload.role)) return null;

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
