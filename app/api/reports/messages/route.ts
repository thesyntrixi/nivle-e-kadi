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
  return { dateFrom, dateTo };
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
    const groupBy = searchParams.get('groupby') ?? 'status';

    const params: (string | Date)[] = [userId];
    let dateFilter = '';

    if (dateFrom) {
      params.push(dateFrom, dateTo);
      const idx = params.length - 1;
      dateFilter = ` AND m.created_at >= $${idx} AND m.created_at <= $${idx + 1}`;
    }

    if (groupBy === 'day') {
      let guestDateFilter = '';
      const guestParams: (string | Date)[] = [userId];

      if (dateFrom) {
        guestParams.push(dateFrom, dateTo);
        const idx = guestParams.length - 1;
        guestDateFilter = ` AND g.opened_at >= $${idx} AND g.opened_at <= $${idx + 1}`;
      }

      const sentResult = await query(
        `SELECT DATE(m.created_at) AS date,
                COUNT(CASE WHEN m.status IN ('Sent', 'Delivered', 'Failed') THEN 1 END)::int AS sent,
                COUNT(CASE WHEN m.status = 'Delivered' THEN 1 END)::int AS delivered
         FROM messages m
         JOIN events e ON m.event_id = e.id
         JOIN clients c ON e.client_id = c.id
         WHERE c.user_id = $1${dateFilter}
         GROUP BY DATE(m.created_at)
         ORDER BY date ASC`,
        params
      );

      const openedResult = await query(
        `SELECT DATE(g.opened_at) AS date, COUNT(*)::int AS opened
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN clients c ON e.client_id = c.id
         WHERE c.user_id = $1 AND g.opened_at IS NOT NULL${guestDateFilter}
         GROUP BY DATE(g.opened_at)
         ORDER BY date ASC`,
        guestParams
      );

      const openedMap = new Map(
        openedResult.rows.map((r: { date: string; opened: number }) => [
          String(r.date).slice(0, 10),
          r.opened,
        ])
      );

      const timeline = sentResult.rows.map(
        (row: { date: string; sent: number; delivered: number }) => {
          const dateStr = String(row.date).slice(0, 10);
          const opened = openedMap.get(dateStr) ?? 0;
          const openRate =
            row.sent > 0 ? Math.round((opened / row.sent) * 1000) / 10 : 0;
          return {
            date: dateStr,
            sent: row.sent,
            delivered: row.delivered,
            opened,
            openRate,
          };
        }
      );

      return NextResponse.json({ success: true, data: timeline });
    }

    const messagesResult = await query(
      `SELECT m.status, COUNT(*)::int AS count
       FROM messages m
       JOIN events e ON m.event_id = e.id
       JOIN clients c ON e.client_id = c.id
       WHERE c.user_id = $1${dateFilter}
       GROUP BY m.status`,
      params
    );

    let guestDateFilter = '';
    const guestParams: (string | Date)[] = [userId];
    if (dateFrom) {
      guestParams.push(dateFrom, dateTo);
      const idx = guestParams.length - 1;
      guestDateFilter = ` AND g.created_at >= $${idx} AND g.created_at <= $${idx + 1}`;
    }

    const openedGuests = await query(
      `SELECT COUNT(*)::int AS count FROM guests g
       JOIN events e ON g.event_id = e.id
       JOIN clients c ON e.client_id = c.id
       WHERE c.user_id = $1 AND g.status = 'Opened'${guestDateFilter}`,
      guestParams
    );

    const statusData: { status: string; count: number }[] = messagesResult.rows.map(
      (row: { status: string; count: number }) => ({
        status: row.status,
        count: row.count,
      })
    );

    const hasOpened = statusData.some((s) => s.status === 'Opened');
    if (!hasOpened && openedGuests.rows[0].count > 0) {
      statusData.push({ status: 'Opened', count: openedGuests.rows[0].count });
    }

    const order = ['Pending', 'Sent', 'Delivered', 'Opened', 'Failed'];
    statusData.sort(
      (a, b) => order.indexOf(a.status) - order.indexOf(b.status)
    );

    return NextResponse.json({ success: true, data: statusData });
  } catch (error) {
    console.error('GET /api/reports/messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load message data. Please try again.' },
      { status: 500 }
    );
  }
}
