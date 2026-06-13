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
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

    let result;

    if (dateFrom) {
      result = await query(
        `SELECT e.id AS event_id, e.name AS event_name,
                COUNT(g.id)::int AS guest_count
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN clients c ON e.client_id = c.id
         WHERE c.user_id = $1 AND c.is_active = true
           AND g.created_at >= $2 AND g.created_at <= $3
         GROUP BY e.id, e.name
         ORDER BY guest_count DESC
         LIMIT $4`,
        [userId, dateFrom, dateTo, limit]
      );
    } else {
      result = await query(
        `SELECT e.id AS event_id, e.name AS event_name,
                COUNT(g.id)::int AS guest_count
         FROM guests g
         JOIN events e ON g.event_id = e.id
         JOIN clients c ON e.client_id = c.id
         WHERE c.user_id = $1 AND c.is_active = true
         GROUP BY e.id, e.name
         ORDER BY guest_count DESC
         LIMIT $2`,
        [userId, limit]
      );
    }

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/reports/guests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load guest data. Please try again.' },
      { status: 500 }
    );
  }
}
