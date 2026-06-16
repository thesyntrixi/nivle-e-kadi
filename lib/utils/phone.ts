// lib/utils/phone.ts
// Tanzania phone normalization: store as 255XXXXXXXXX (12 digits, no +)

/**
 * Normalize any input to storage format 255XXXXXXXXX.
 * 0767987878 → 255767987878
 * 255767987878 → 255767987878
 * +255767987878 → 255767987878
 */
export function normalizePhoneForStorage(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('255') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `255${digits.slice(1)}`;
  }

  return null;
}

/** Format for sendSMS() — expects +255XXXXXXXXX */
export function formatPhoneForSmsApi(phone: string): string {
  const stored = normalizePhoneForStorage(phone);
  const digits = stored ?? phone.replace(/\D/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/** Format for WhatsApp Cloud API — digits only, no + */
export function formatPhoneForWhatsAppApi(phone: string): string {
  const stored = normalizePhoneForStorage(phone);
  return (stored ?? phone.replace(/\D/g, '')).replace(/^\+/, '');
}
