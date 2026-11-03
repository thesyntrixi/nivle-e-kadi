import { createHmac, timingSafeEqual } from 'node:crypto';

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function verifyWhatsAppSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header || !header.startsWith('sha256=')) return false;
  const provided = header.slice('sha256='.length);
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return constantTimeEqual(provided, expected);
}

export function verifyWhatsAppHubToken(provided: string | null): boolean {
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expected || provided === null) return false;
  return constantTimeEqual(provided, expected);
}
