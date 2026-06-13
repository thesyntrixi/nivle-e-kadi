import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { getGuestsByEventId } from '@/lib/database/queries';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function verifyEventOwnership(
  userId: string,
  eventId: string
): Promise<boolean> {
  const result = await query(
    `SELECT e.id FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows.length > 0;
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

    if (!(await verifyEventOwnership(userId, eventId))) {
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
