// lib/services/shukrani.ts
// Thank-you + marketing message builders for Tuma Shukrani

import { GuestType } from '@/lib/database/types';
import { formatGuestDisplayName } from '@/lib/services/sms';

export function buildShukraniSmsBody(
  guestName: string,
  guestType: GuestType,
  eventName: string
): string {
  const displayName = formatGuestDisplayName(guestName, guestType);
  const marketing =
    ' Tunahusika na mialiko ya kidigitali. Wasiliana: 0767987878 au kelvin@nivle-ekadi.com - NIVLE E-Kadi';

  if (guestType === 'double') {
    return `Habari ${displayName}, asante kwa kuja kwenye ${eventName}. Uwepo wenu ulifanya tukio hili kuwa la kipekee. Mna tukio linalokuja la aina yoyote? Harusi, birthday, graduation, conference, ticket au mengine?${marketing}`;
  }

  return `Habari ${displayName}, asante kwa kuja kwenye ${eventName}. Uwepo wako ulifanya tukio hili kuwa la kipekee. Una tukio linalokuja la aina yoyote? Harusi, birthday, graduation, conference, ticket au mengine?${marketing}`;
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
