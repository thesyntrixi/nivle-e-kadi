/** True when guest should receive WhatsApp (default true for legacy rows). */
export function guestHasWhatsApp(hasWhatsapp: boolean | undefined | null): boolean {
  return hasWhatsapp !== false;
}

/** Parse bulk import WhatsApp column; missing/empty defaults to true. */
export function parseHasWhatsappFromImport(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  const normalized = raw.toLowerCase();
  return ['ndiyo', 'yes', 'true', '1', 'y'].includes(normalized);
}
