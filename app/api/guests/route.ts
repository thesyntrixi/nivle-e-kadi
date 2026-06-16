export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { createGuest, getGuestsByEventId } from '@/lib/database/queries';
import { Event } from '@/lib/database/types';
import { normalizePhoneForStorage } from '@/lib/utils/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedEvent(
  userId: string,
  eventId: string
): Promise<{ id: string; type: Event['type'] } | null> {
  const result = await query(
    `SELECT e.id, e.type FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] || null;
}

function getCodePrefix(eventType: Event['type']): string {
  const prefixes: Record<Event['type'], string> = {
    Wedding: 'WED',
    Birthday: 'BDA',
    Conference: 'CON',
    Corporate: 'COR',
    Other: 'EVT',
  };
  return prefixes[eventType] || 'EVT';
}

async function generateUniqueCode(
  eventId: string,
  eventType: Event['type'],
  sequence: number
): Promise<string> {
  const prefix = getCodePrefix(eventType);
  let attempt = sequence;

  for (let i = 0; i < 100; i++) {
    const code = `${prefix}-${String(attempt).padStart(5, '0')}`;
    const existing = await query(
      'SELECT id FROM guests WHERE invitation_code = $1',
      [code]
    );
    if (existing.rows.length === 0) {
      return code;
    }
    attempt++;
  }

  const fallback = `${prefix}-${eventId.slice(0, 4).toUpperCase()}-${Date.now().toString(36)}`;
  return fallback.slice(0, 20);
}

async function isDuplicate(
  eventId: string,
  name: string,
  phone: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM guests
     WHERE event_id = $1 AND LOWER(name) = LOWER($2) AND phone = $3`,
    [eventId, name, phone]
  );
  return result.rows.length > 0;
}

async function updateEventGuestCount(eventId: string): Promise<void> {
  await query(
    `UPDATE events SET guest_count = (
       SELECT COUNT(*)::int FROM guests WHERE event_id = $1
     ), updated_at = NOW() WHERE id = $1`,
    [eventId]
  );
}

function validateGuestBody(body: {
  event_id?: string;
  name?: string;
  email?: string | null;
  phone?: string;
  guest_type?: string;
}): { error: string } | { phone: string; email: string | null } {
  const eventId = body.event_id?.trim();
  const name = body.name?.trim();
  const rawEmail = body.email?.trim() ?? '';
  const rawPhone = body.phone?.trim() ?? '';

  if (!eventId) {
    return { error: 'Event is required' };
  }
  if (!name || name.length < 2) {
    return { error: 'Name must be at least 2 characters' };
  }
  if (name.length > 100) {
    return { error: 'Name must be at most 100 characters' };
  }
  if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
    return { error: 'Invalid email format' };
  }
  if (!rawPhone) {
    return { error: 'Phone number is required' };
  }

  const phone = normalizePhoneForStorage(rawPhone);
  if (!phone) {
    return { error: 'Invalid phone number. Use 076XXXXXXXX or 255XXXXXXXXX' };
  }

  const guestType = body.guest_type?.trim();
  if (guestType && guestType !== 'single' && guestType !== 'double') {
    return { error: 'Guest type must be single or double' };
  }

  return { phone, email: rawEmail || null };
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    if (!(await getOwnedEvent(userId, eventId))) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const guests = await getGuestsByEventId(eventId);
    return NextResponse.json({ success: true, data: guests });
  } catch (error) {
    console.error('GET /api/guests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load guests. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateGuestBody(body);

    if ('error' in validation) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const eventId = body.event_id.trim();
    const name = body.name.trim();
    const email = validation.email;
    const phone = validation.phone;
    const guestType =
      body.guest_type === 'double' ? 'double' : ('single' as const);

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    if (await isDuplicate(eventId, name, phone)) {
      return NextResponse.json(
        { success: false, error: 'A guest with this name and phone already exists' },
        { status: 409 }
      );
    }

    const countResult = await query(
      'SELECT COUNT(*)::int AS count FROM guests WHERE event_id = $1',
      [eventId]
    );
    const sequence = countResult.rows[0].count + 1;
    const invitationCode = await generateUniqueCode(eventId, event.type, sequence);

    const guest = await createGuest({
      event_id: eventId,
      name,
      phone,
      email,
      invitation_code: invitationCode,
      qr_code_url: null,
      personalized_card_url: null,
      sent_at: null,
      delivered_at: null,
      opened_at: null,
      status: 'Pending',
      guest_type: guestType,
    });

    await updateEventGuestCount(eventId);

    return NextResponse.json({ success: true, data: guest });
  } catch (error) {
    console.error('POST /api/guests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add guest. Please try again.' },
      { status: 500 }
    );
  }
}
