// lib/services/shukrani.ts
// Thank-you + marketing message builders for Tuma Shukrani

import { GuestType } from '@/lib/database/types';
import { formatGuestDisplayName } from '@/lib/services/sms';

const SHUKRANI_SMS_SINGLE =
  'Habari {name}! Asante kwa kuja kwenye {event_name}. Una tukio jingine? Tunahusika na mialiko ya kidigitali. Call/WA: 0767987878 - NIVLE E-Kadi';

const SHUKRANI_SMS_DOUBLE =
  'Habari {name}! Asante kwa kuja kwenye {event_name}. Mna tukio jingine? Tunahusika na mialiko ya kidigitali. Call/WA: 0767987878 - NIVLE E-Kadi';

export function buildShukraniSmsBody(
  guestName: string,
  guestType: GuestType,
  eventName: string
): string {
  const template = guestType === 'double' ? SHUKRANI_SMS_DOUBLE : SHUKRANI_SMS_SINGLE;
  return template.replace('{name}', guestName).replace('{event_name}', eventName);
}

export function getShukraniSmsPreview(eventName: string): { single: string; double: string } {
  return {
    single: buildShukraniSmsBody('Mfano Mgeni', 'single', eventName),
    double: buildShukraniSmsBody('Mfano Mgeni', 'double', eventName),
  };
}

export function getShukraniWhatsAppPreview(eventName: string): string {
  const displayName = formatGuestDisplayName('Mfano Mgeni', 'single');
  return `Template: nivle_shukrani\n{{1}} = ${displayName}\n{{2}} = ${eventName}`;
}
