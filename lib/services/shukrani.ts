// lib/services/shukrani.ts
// Thank-you + marketing message builders for Tuma Shukrani

import { GuestType } from '@/lib/database/types';
import { formatGuestDisplayName } from '@/lib/services/sms';

const SHUKRANI_MARKETING_SUFFIX =
  ' Kama unalo tukio lako lolote au la mtu mwingine linalokuja la aina yoyote iwe Harusi, birthday, graduation, conference, ticket au mengine - tunahusika na mialiko ya kidigitali ya hali ya juu. Call 0767987878 au kelvin@nivle-ekadi.com - NIVLE E-Kadi';

const SHUKRANI_MARKETING_SUFFIX_DOUBLE =
  ' Kama tukio lako lolote au la mtu mwingine linalokuja la aina yoyote iwe Harusi, birthday, graduation, conference, ticket au mengine - tunahusika na mialiko ya kidigitali ya hali ya juu. Call 0767987878 au kelvin@nivle-ekadi.com - NIVLE E-Kadi';

export function buildShukraniSmsBody(
  guestName: string,
  guestType: GuestType,
  eventName: string
): string {
  if (guestType === 'double') {
    return `Habari ${guestName} (Double - watu 2)! Asante sana kwa kuja kwenye ${eventName}. Uwepo wenu ulifanya tukio hili kuwa la kipekee.${SHUKRANI_MARKETING_SUFFIX_DOUBLE}`;
  }

  return `Habari ${guestName} (Single)! Asante sana kwa kuja kwenye ${eventName}. Uwepo wako ulifanya tukio hili kuwa la kipekee.${SHUKRANI_MARKETING_SUFFIX}`;
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
