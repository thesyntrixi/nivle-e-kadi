export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const dateTo = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const dateFrom = from ? new Date(`${from}T00:00:00.000Z`) : null;
  return { dateFrom, dateTo, from, to };
}

function getPreviousRange(dateFrom: Date | null, dateTo: Date) {
  if (!dateFrom) {
    const prevTo = new Date(dateTo);
    prevTo.setDate(prevTo.getDate() - 30);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 30);
    return { prevFrom, prevTo };
  }
  const duration = dateTo.getTime() - dateFrom.getTime();
  const prevTo = new Date(dateFrom.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - duration);
  return { prevFrom, prevTo };
}

function calcTrend(current: number, previous: number): {
  change: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) {
    return { change: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change > 0) return { change, direction: 'up' };
  if (change < 0) return { change, direction: 'down' };
  return { change: 0, direction: 'neutral' };
}

async function fetchStats(
  userId: string,
  dateFrom: Date | null,
  dateTo: Date
) {
  const params: (string | Date)[] = [userId];
  let clientDate = '';
  let eventDate = '';
  let guestDate = '';
  let messageDate = '';

  if (dateFrom) {
    params.push(dateFrom, dateTo);
    const idx = params.length - 1;
    clientDate = ` AND c.created_at >= $${idx} AND c.created_at <= $${idx + 1}`;
    eventDate = ` AND e.created_at >= $${idx} AND e.created_at <= $${idx + 1}`;
    guestDate = ` AND g.created_at >= $${idx} AND g.created_at <= $${idx + 1}`;
    messageDate = ` AND m.created_at >= $${idx} AND m.created_at <= $${idx + 1}`;
  }

  const clientsResult = await query(
    `SELECT COUNT(*)::int AS count FROM clients c
     WHERE c.user_id = $1 AND c.is_active = true${clientDate}`,
    params
  );

  const eventsResult = await query(
    `SELECT COUNT(*)::int AS count FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE c.user_id = $1 AND c.is_active = true${eventDate}`,
    params
  );

  const guestsResult = await query(
    `SELECT COUNT(*)::int AS count FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE c.user_id = $1 AND c.is_active = true${guestDate}`,
    params
  );

  const messagesResult = await query(
    `SELECT
       COUNT(CASE WHEN m.status IN ('Sent', 'Delivered', 'Failed') THEN 1 END)::int AS sent,
       COUNT(CASE WHEN m.status = 'Delivered' THEN 1 END)::int AS delivered
     FROM messages m
     JOIN events e ON m.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE c.user_id = $1${messageDate}`,
    params
  );

  const openedResult = await query(
    `SELECT COUNT(*)::int AS count FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE c.user_id = $1 AND c.is_active = true AND g.status = 'Opened'${guestDate}`,
    params
  );

  const totalClients = clientsResult.rows[0].count;
  const totalEvents = eventsResult.rows[0].count;
  const totalGuests = guestsResult.rows[0].count;
  const messagesSent = messagesResult.rows[0].sent;
  const messagesDelivered = messagesResult.rows[0].delivered;
  const messagesOpened = openedResult.rows[0].count;

  const deliveryRate =
    messagesSent > 0
      ? Math.round((messagesDelivered / messagesSent) * 1000) / 10
      : 0;
  const openRate =
    messagesSent > 0
      ? Math.round((messagesOpened / messagesSent) * 1000) / 10
      : 0;

  return {
    totalClients,
    totalEvents,
    totalGuests,
    messagesSent,
    messagesDelivered,
    messagesOpened,
    deliveryRate,
    openRate,
  };
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
    const { dateFrom, dateTo } = parseDateRange(searchParams);

    const current = await fetchStats(userId, dateFrom, dateTo);
    const { prevFrom, prevTo } = getPreviousRange(dateFrom, dateTo);
    const previous = await fetchStats(userId, prevFrom, prevTo);

    const trends = {
      totalClients: calcTrend(current.totalClients, previous.totalClients),
      totalEvents: calcTrend(current.totalEvents, previous.totalEvents),
      totalGuests: calcTrend(current.totalGuests, previous.totalGuests),
      messagesSent: calcTrend(current.messagesSent, previous.messagesSent),
      deliveryRate: calcTrend(current.deliveryRate, previous.deliveryRate),
      openRate: calcTrend(current.openRate, previous.openRate),
    };

    return NextResponse.json({
      success: true,
      data: { ...current, trends },
    });
  } catch (error) {
    console.error('GET /api/reports/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load statistics. Please try again.' },
      { status: 500 }
    );
  }
}
