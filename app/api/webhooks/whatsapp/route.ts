export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
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

function parseWebhookTimestamp(timestamp?: string): Date {
  if (!timestamp) return new Date();
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date();
  return new Date(seconds * 1000);
}

async function inboundMessageExists(externalId: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM messages WHERE external_message_id = $1 LIMIT 1',
    [externalId]
  );
  return result.rows.length > 0;
}

async function logPhoneMatchingDebug(rawFrom: string) {
  console.log('WhatsApp inbound: matching guest', {
    channel: 'whatsapp',
    phone: `***${String(rawFrom).slice(-3)}`,
  });

  const guestPhonesResult = await query(
    'SELECT phone FROM guests ORDER BY created_at DESC LIMIT 20'
  );
  console.log('WhatsApp inbound: sample guest phones in DB (limit 20):', {
    count: guestPhonesResult.rows.length,
  });

  console.log('WhatsApp inbound: getGuestByPhone lookup', {
    phone: `***${String(rawFrom).slice(-3)}`,
  });
  const guest = await getGuestByPhone(rawFrom);
  console.log('WhatsApp inbound: getGuestByPhone result:', guest
    ? {
        id: guest.id,
        event_id: guest.event_id,
        phone: `***${String(guest.phone).slice(-3)}`,
      }
    : null);

  return guest;
}

async function handleInboundTextMessage(message: Record<string, unknown>) {
  const from = message.from as string | undefined;
  const textBody = (message.text as { body?: string } | undefined)?.body;
  const externalId = message.id as string | undefined;
  const messageType = message.type as string | undefined;

  console.log('WhatsApp inbound: processing text message', {
    channel: 'whatsapp',
    phone: from ? `***${String(from).slice(-3)}` : undefined,
    messageType,
    externalId,
    hasBody: Boolean(textBody?.trim()),
  });

  if (messageType !== 'text') {
    console.log('WhatsApp inbound: skipped non-text message', { messageType });
    return;
  }

  if (!from || !textBody?.trim()) {
    console.log('WhatsApp inbound: missing from or text body');
    return;
  }

  if (externalId && (await inboundMessageExists(externalId))) {
    console.log('WhatsApp inbound: duplicate message ignored', { externalId });
    return;
  }

  const guest = await logPhoneMatchingDebug(from);
  if (!guest) {
    console.log('WhatsApp inbound: no guest found', {
      phone: `***${String(from).slice(-3)}`,
    });
    return;
  }

  const sentAt = parseWebhookTimestamp(message.timestamp as string | undefined);

  await query(
    `INSERT INTO messages
       (guest_id, event_id, message_type, direction, content, status, external_message_id, sent_at)
     VALUES ($1, $2, 'WhatsApp', 'inbound', $3, 'Delivered', $4, $5)`,
    [guest.id, guest.event_id, textBody.trim(), externalId ?? null, sentAt]
  );

  console.log('WhatsApp inbound message recorded', {
    guestId: guest.id,
    eventId: guest.event_id,
    channel: 'whatsapp',
    externalId,
  });
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
    const body = await request.json();

    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const field = change?.field as string | undefined;
        const value = change?.value;
        const messages = value?.messages;
        const statuses = value?.statuses;

        console.log('WhatsApp webhook change:', {
          field,
          hasMessages: Array.isArray(messages),
          messageCount: Array.isArray(messages) ? messages.length : 0,
          messageTypes: Array.isArray(messages)
            ? messages.map((m: { type?: string }) => m?.type)
            : [],
          hasStatuses: Array.isArray(statuses),
          statusCount: Array.isArray(statuses) ? statuses.length : 0,
        });

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
            console.log('WhatsApp RSVP: unrecognized button reply', { title, id });
            continue;
          }

          const guest = await getGuestByPhone(from);
          if (!guest) {
            console.log('WhatsApp RSVP: no guest found', {
              phone: `***${String(from).slice(-3)}`,
              rsvpStatus,
            });
            continue;
          }

          const currentRsvp = guest.rsvp_status ?? 'pending';
          if (currentRsvp !== 'pending') {
            console.log('WhatsApp RSVP: ignored duplicate RSVP response', {
              guestId: guest.id,
              existingRsvp: currentRsvp,
              attemptedRsvp: rsvpStatus,
            });
            continue;
          }

          await updateGuestRsvp(guest.id, rsvpStatus);
          console.log('WhatsApp RSVP recorded', {
            guestId: guest.id,
            rsvpStatus,
          });
        }

        for (const message of messages) {
          if (message?.type !== 'text') continue;

          try {
            await handleInboundTextMessage(message as Record<string, unknown>);
          } catch (inboundError) {
            console.error('WhatsApp inbound text insert failed:', {
              error: inboundError instanceof Error ? inboundError.message : inboundError,
              externalId: message.id,
              hint: 'Ensure production DB has direction column (npm run db:add-message-direction)',
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp webhook processing error:', error);
  }

  return new NextResponse('OK', { status: 200 });
}
