import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { getClientById, createEvent } from '@/lib/database/queries';
import { Event } from '@/lib/database/types';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Conference', 'Corporate', 'Other'] as const;
const EVENT_STATUSES = ['Draft', 'Active', 'Completed'] as const;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_REGEX = /^https?:\/\/.+/i;

export type EventWithClient = Event & { client_name: string };

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

async function fetchEventWithClient(eventId: string, userId: string): Promise<EventWithClient | null> {
  const result = await query(
    `SELECT e.*, c.name AS client_name
     FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return (result.rows[0] as EventWithClient) || null;
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
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT e.*, c.name AS client_name
      FROM events e
      JOIN clients c ON e.client_id = c.id
      WHERE c.user_id = $1 AND c.is_active = true
    `;
    const params: string[] = [userId];

    if (clientId) {
      params.push(clientId);
      sql += ` AND e.client_id = $${params.length}`;
    }
    if (status && EVENT_STATUSES.includes(status as (typeof EVENT_STATUSES)[number])) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    sql += ' ORDER BY e.date DESC, e.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load events. Please try again.' },
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

    const event = await createEvent({
      client_id: body.client_id,
      name: body.name.trim(),
      type: body.type as Event['type'],
      date: new Date(body.date.trim()),
      time: body.time?.trim() || null,
      venue: body.venue?.trim() || null,
      location_link: body.location_link?.trim() || null,
      card_template_url: null,
      status: body.status as Event['status'],
      guest_count: 0,
    });

    const withClient = await fetchEventWithClient(event.id, userId);
    return NextResponse.json(
      { success: true, data: withClient ?? event },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event. Please try again.' },
      { status: 500 }
    );
  }
}
