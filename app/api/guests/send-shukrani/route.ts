export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { GuestType } from '@/lib/database/types';
import { getShukraniGuestBatch, getShukraniGuestCount } from '@/lib/database/queries';
import { buildShukraniSmsBody } from '@/lib/services/shukrani';
import { sendSMS } from '@/lib/services/sms';
import { sendWhatsAppShukrani } from '@/lib/services/whatsapp';

const GUEST_DELAY_MS = 400;
const DEFAULT_BATCH_SIZE = 10;

type ShukraniChannel = 'sms' | 'whatsapp' | 'both';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedEvent(userId: string, eventId: string) {
  const result = await query(
    `SELECT e.id, e.name
     FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] as { id: string; name: string } | undefined;
}

function formatPhoneForSending(phone: string): string {
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('255')) return `+${trimmed}`;
  if (trimmed.startsWith('0')) return `+255${trimmed.slice(1)}`;
  return `+${trimmed}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseChannel(value: unknown): ShukraniChannel | null {
  if (value === 'sms' || value === 'whatsapp' || value === 'both') {
    return value;
  }
  return null;
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

    const total = await getShukraniGuestCount(eventId);
    return NextResponse.json({
      success: true,
      data: { total, event_name: event.name },
    });
  } catch (error) {
    console.error('GET /api/guests/send-shukrani error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guest count' },
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
    const channel = parseChannel(body.channel);
    const offset = Math.max(Number(body.offset) || 0, 0);
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

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'channel must be sms, whatsapp, or both' },
        { status: 400 }
      );
    }

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const total = await getShukraniGuestCount(eventId);
    const guests = await getShukraniGuestBatch(eventId, batchSize, offset);

    let smsSent = 0;
    let smsFailed = 0;
    let whatsappSent = 0;
    let whatsappFailed = 0;

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      const guestType = (guest.guest_type ?? 'single') as GuestType;
      const phone = formatPhoneForSending(guest.phone);

      if (channel === 'sms' || channel === 'both') {
        try {
          const smsBody = buildShukraniSmsBody(guest.name, guestType, event.name);
          const smsResult = await sendSMS(phone, smsBody);
          if (smsResult.success) {
            smsSent++;
          } else {
            smsFailed++;
          }
        } catch (err) {
          console.error('Shukrani SMS error:', err);
          smsFailed++;
        }
      }

      if (channel === 'whatsapp' || channel === 'both') {
        try {
          const waResult = await sendWhatsAppShukrani(phone, {
            guestName: guest.name,
            guestType,
            eventName: event.name,
          });
          if (waResult.success) {
            whatsappSent++;
          } else {
            whatsappFailed++;
          }
        } catch (err) {
          console.error('Shukrani WhatsApp error:', err);
          whatsappFailed++;
        }
      }

      if (i < guests.length - 1) {
        await delay(GUEST_DELAY_MS);
      }
    }

    const processed = guests.length;
    const remaining = Math.max(total - offset - processed, 0);

    return NextResponse.json({
      success: true,
      data: {
        processed,
        sms_sent: smsSent,
        sms_failed: smsFailed,
        whatsapp_sent: whatsappSent,
        whatsapp_failed: whatsappFailed,
        remaining,
        total,
      },
    });
  } catch (error) {
    console.error('POST /api/guests/send-shukrani error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send shukrani batch' },
      { status: 500 }
    );
  }
}
