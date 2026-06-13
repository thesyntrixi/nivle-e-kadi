export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { getClientById } from '@/lib/database/queries';
import { Event } from '@/lib/database/types';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Conference', 'Corporate', 'Other'] as const;
const EVENT_STATUSES = ['Draft', 'Active', 'Completed'] as const;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_REGEX = /^https?:\/\/.+/i;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

function validateEventBody(body: {
  client_id?: string;
  name?: string;
  type?: string;
  date?: string;
  time?: string;
  venue?: string;
  location_link?: string;
  status?: string;
}): string | null {
  const name = body.name?.trim();
  const type = body.type?.trim();
  const date = body.date?.trim();
  const time = body.time?.trim();
  const venue = body.venue?.trim();
  const locationLink = body.location_link?.trim();
  const status = body.status?.trim();

  if (!body.client_id) {
    return 'Client is required';
  }
  if (!name || name.length < 2) {
    return 'Event name must be at least 2 characters';
  }
  if (name.length > 100) {
    return 'Event name must be at most 100 characters';
  }
  if (!type || !EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) {
    return 'Invalid event type';
  }
  if (!date) {
    return 'Date is required';
  }
  if (Number.isNaN(Date.parse(date))) {
    return 'Invalid date format';
  }
  if (time && !TIME_REGEX.test(time)) {
    return 'Invalid time format (use HH:MM)';
  }
  if (venue && venue.length > 100) {
    return 'Venue must be at most 100 characters';
  }
  if (locationLink && !URL_REGEX.test(locationLink)) {
    return 'Location link must be a valid URL';
  }
  if (!status || !EVENT_STATUSES.includes(status as (typeof EVENT_STATUSES)[number])) {
    return 'Invalid status';
  }

  return null;
}

async function verifyClientOwnership(userId: string, clientId: string): Promise<boolean> {
  const client = await getClientById(clientId);
  return !!(client && client.user_id === userId && client.is_active);
}

async function fetchEventWithClient(eventId: string, userId: string) {
  const result = await query(
    `SELECT e.*, c.name AS client_name
     FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const event = await fetchEventWithClient(params.id, userId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('GET /api/events/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load event. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await fetchEventWithClient(params.id, userId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationError = validateEventBody(body);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    if (!(await verifyClientOwnership(userId, body.client_id))) {
      return NextResponse.json(
        { success: false, error: 'Invalid client selected' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE events
       SET client_id = $2, name = $3, type = $4, date = $5, time = $6,
           venue = $7, location_link = $8, status = $9, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        params.id,
        body.client_id,
        body.name.trim(),
        body.type as Event['type'],
        body.date.trim(),
        body.time?.trim() || null,
        body.venue?.trim() || null,
        body.location_link?.trim() || null,
        body.status as Event['status'],
      ]
    );

    const updated = await fetchEventWithClient(result.rows[0].id, userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/events/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update event. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await fetchEventWithClient(params.id, userId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM events WHERE id = $1', [params.id]);

    return NextResponse.json({
      success: true,
      message: 'Event deleted',
    });
  } catch (error) {
    console.error('DELETE /api/events/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event. Please try again.' },
      { status: 500 }
    );
  }
}
