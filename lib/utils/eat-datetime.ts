// lib/utils/eat-datetime.ts
// Display-only formatters for East Africa Time (UTC+3, Africa/Nairobi)

export const EAT_TIMEZONE = 'Africa/Nairobi';
export const EAT_LOCALE = 'sw-TZ';

/** YYYY-MM-DD calendar day in EAT — for Today/Yesterday comparisons. */
export function getEatDateKey(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: EAT_TIMEZONE });
}

export function formatEatTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(EAT_LOCALE, {
    timeZone: EAT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(EAT_LOCALE, {
    timeZone: EAT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEatDateGroup(value: Date | string): string {
  const valueKey = getEatDateKey(value);
  const todayKey = getEatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getEatDateKey(yesterday);

  if (valueKey === todayKey) return 'Today';
  if (valueKey === yesterdayKey) return 'Yesterday';

  return new Date(value).toLocaleDateString(EAT_LOCALE, {
    timeZone: EAT_TIMEZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatEatListTime(value?: Date | string): string {
  if (!value) return '';
  const valueKey = getEatDateKey(value);
  const todayKey = getEatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (valueKey === todayKey) return formatEatTime(value);
  if (valueKey === getEatDateKey(yesterday)) return 'Yesterday';

  return new Date(value).toLocaleDateString(EAT_LOCALE, {
    timeZone: EAT_TIMEZONE,
    month: 'short',
    day: 'numeric',
  });
}
