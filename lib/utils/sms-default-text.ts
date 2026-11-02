import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';

export type SmsDefaultEvent = {
  name: string;
  family_name?: string | null;
  type?: string | null;
  date: Date | string;
  time?: string | null;
  venue?: string | null;
};

function eventPhrase(type: string | null | undefined, what: string): string {
  const normalized = type?.trim().toLowerCase() ?? '';
  if (normalized === 'wedding') {
    return `mwaliko wa HARUSI YA ${what}`;
  }
  if (normalized === 'sendoff') {
    return `mwaliko wa SENDOFF YA ${what}`;
  }
  if (normalized === 'ticket') {
    return `tiketi yako ya ${what}`;
  }
  return `mwaliko wa ${what}`;
}

export function buildDefaultSmsText(event: SmsDefaultEvent): string {
  const what = event.family_name?.trim() ? event.family_name.trim() : event.name;
  const phrase = eventPhrase(event.type, what);
  const dateTime = formatSwahiliDateTime(event.date, event.time);
  const venue = event.venue?.trim() ?? '';

  return `Habari [JINA],

Tafadhali pokea ${phrase}, itakayofanyika ${dateTime}, ${venue}.

Maelezo yote ya tukio angalia kwenye kadi hapo juu.
Tafadhali fika na kadi hii na uthibitishe ushiriki wako kwa kuchagua mojawapo ya vitufe vilivyo hapa chini ambavyo ni Nitakuwepo / Sitakuwepo.

Asante.
NIVLE E-Kadi`;
}
