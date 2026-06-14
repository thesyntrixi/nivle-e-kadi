// lib/token.ts
// Edge-compatible token utilities (no database imports)

export type UserRole = 'admin' | 'check-in-staff';

export function generateToken(userId: string, role: UserRole = 'admin'): string {
  const payload = {
    userId,
    role,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token: string): { userId: string; role: UserRole } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString()) as {
      userId: string;
      role?: UserRole;
      exp: number;
    };

    if (payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role ?? 'admin',
    };
  } catch {
    return null;
  }
}
