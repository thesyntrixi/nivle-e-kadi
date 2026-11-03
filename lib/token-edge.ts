// Edge-runtime session verifier. Same token format as lib/token.ts.

export type UserRole = 'admin' | 'check-in-staff';

function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'check-in-staff';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function signPayload(payloadPart: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadPart)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBytes = new TextEncoder().encode(actual);
  const expectedBytes = new TextEncoder().encode(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < actualBytes.length; i++) {
    diff |= actualBytes[i] ^ expectedBytes[i];
  }
  return diff === 0;
}

export async function verifyTokenEdge(
  token: string
): Promise<{ userId: string; role: UserRole } | null> {
  try {
    const secret = authSecret();
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadPart, signaturePart] = parts;
    if (!payloadPart || !signaturePart) return null;
    if (!signaturesMatch(signaturePart, await signPayload(payloadPart, secret))) return null;

    const payload = JSON.parse(base64UrlToString(payloadPart)) as {
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
