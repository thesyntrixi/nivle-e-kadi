export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getGuestByPhone, updateGuestRsvp } from '@/lib/database/queries';

type RsvpStatus = 'attending' | 'not_attending';

function parseRsvpFromButton(title?: string, id?: string): RsvpStatus | null {
  const combined = `${title ?? ''} ${id ?? ''}`.toLowerCase();

  if (combined.includes('nitakuwepo')) {
    return 'attending';
  }

  if (combined.includes('sitakuwepo')) {
    return 'not_attending';
  }

  return null;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const messages = change?.value?.messages;
        if (!Array.isArray(messages)) continue;

        for (const message of messages) {
          if (message?.type !== 'interactive') continue;

          const interactive = message.interactive;
          if (interactive?.type !== 'button_reply') continue;

          const from = message.from as string | undefined;
          const buttonReply = interactive.button_reply;
          const title = buttonReply?.title as string | undefined;
          const id = buttonReply?.id as string | undefined;

          if (!from) continue;

          const rsvpStatus = parseRsvpFromButton(title, id);
          if (!rsvpStatus) {
            console.log('WhatsApp RSVP: unrecognized button reply', { from, title, id });
            continue;
          }

          const guest = await getGuestByPhone(from);
          if (!guest) {
            console.log('WhatsApp RSVP: no guest found for phone', { from, rsvpStatus });
            continue;
          }

          const currentRsvp = guest.rsvp_status ?? 'pending';
          if (currentRsvp !== 'pending') {
            console.log('WhatsApp RSVP: ignored duplicate RSVP response', {
              guestId: guest.id,
              guestName: guest.name,
              phone: from,
              existingRsvp: currentRsvp,
              attemptedRsvp: rsvpStatus,
            });
            continue;
          }

          await updateGuestRsvp(guest.id, rsvpStatus);
          console.log('WhatsApp RSVP recorded', {
            guestId: guest.id,
            guestName: guest.name,
            phone: from,
            rsvpStatus,
          });
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp webhook processing error:', error);
  }

  return new NextResponse('OK', { status: 200 });
}
