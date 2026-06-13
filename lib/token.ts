// lib/token.ts
// Edge-compatible token utilities (no database imports)

export function generateToken(userId: string): string {
  const payload = {
    userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString()) as {
      userId: string;
      exp: number;
    };

    if (payload.exp < Date.now()) {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}
