export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { GuestType } from '@/lib/database/types';
import {
  getEventCardImageUrl,
  getGuestsToSend,
  getPendingCounts,
  markGuestSent,
} from '@/lib/database/queries';
import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';
import { sendSMS } from '@/lib/services/sms';
import { sendWhatsAppInvitation } from '@/lib/services/whatsapp';

const GUEST_DELAY_MS = 400;
const DEFAULT_BATCH_SIZE = 10;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedEvent(userId: string, eventId: string) {
  const result = await query(
    `SELECT e.id, e.name, e.date, e.time, e.venue, e.location_link
     FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] as
    | {
        id: string;
        name: string;
        date: string;
        time: string | null;
        venue: string | null;
        location_link: string | null;
      }
    | undefined;
}

function formatPhoneForSending(phone: string): string {
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('255')) return `+${trimmed}`;
  if (trimmed.startsWith('0')) return `+255${trimmed.slice(1)}`;
  return `+${trimmed}`;
}

function buildSmsInvitationBody(
  eventName: string,
  dateTime: string,
  venue: string,
  locationLink: string
): string {
  const venuePart = venue ? ` Mahali: ${venue}.` : '';
  const mapPart = locationLink ? ` Ramani: ${locationLink}` : '';
  return `Habari {name}, umekaribishwa kwenye ${eventName} ${dateTime}.${venuePart}${mapPart}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = request.nextUrl.searchParams.get('event_id');
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      );
    }

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const remaining = await getPendingCounts(eventId);
    return NextResponse.json({ success: true, data: { remaining } });
  } catch (error) {
    console.error('GET /api/guests/send-batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending counts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = body.event_id as string | undefined;
    const guestType = body.guest_type as GuestType | undefined;
    const batchSize = Math.min(
      Math.max(Number(body.batch_size) || DEFAULT_BATCH_SIZE, 1),
      25
    );

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      );
    }

    if (guestType !== 'single' && guestType !== 'double') {
      return NextResponse.json(
        { success: false, error: 'guest_type must be single or double' },
        { status: 400 }
      );
    }

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const cardImageUrl = await getEventCardImageUrl(eventId);
    if (!cardImageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'No card image found for this event. Upload a card design first.',
        },
        { status: 400 }
      );
    }

    const guests = await getGuestsToSend(eventId, guestType, batchSize, 0);
    const formattedDateTime = formatSwahiliDateTime(event.date, event.time);
    const venue = event.venue ?? '';
    const locationLink = event.location_link ?? '';
    const smsTemplate = buildSmsInvitationBody(
      event.name,
      formattedDateTime,
      venue,
      locationLink
    );

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      const guestTypeValue = guest.guest_type ?? 'single';
      const phone = formatPhoneForSending(guest.phone);

      let smsOk = false;
      let whatsappOk = false;

      try {
        const smsResult = await sendSMS(phone, smsTemplate, {
          guestName: guest.name,
          guestType: guestTypeValue,
        });
        smsOk = smsResult.success;
      } catch (err) {
        console.error('SMS send error:', err);
      }

      try {
        await sendWhatsAppInvitation(phone, {
          guestName: guest.name,
          guestType: guestTypeValue,
          eventName: event.name,
          dateTime: formattedDateTime,
          venue: venue || 'TBA',
          locationLink,
          headerImageUrl: cardImageUrl,
        });
        whatsappOk = true;
      } catch (err) {
        console.error('WhatsApp invitation error:', err);
      }

      const overallSuccess = smsOk || whatsappOk;
      await markGuestSent(guest.id, overallSuccess);

      if (overallSuccess) {
        succeeded++;
      } else {
        failed++;
      }

      if (i < guests.length - 1) {
        await delay(GUEST_DELAY_MS);
      }
    }

    const remaining = await getPendingCounts(eventId);

    return NextResponse.json({
      success: true,
      data: {
        processed: guests.length,
        succeeded,
        failed,
        remaining,
      },
    });
  } catch (error) {
    console.error('POST /api/guests/send-batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation batch' },
      { status: 500 }
    );
  }
}
