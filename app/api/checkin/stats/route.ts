export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/staff-auth';
import { getCheckinStats, getOwnedEventByUserId } from '@/lib/database/queries';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const adminError = requireAdmin(auth);
  if (adminError) {
    return NextResponse.json({ success: false, error: adminError.error }, { status: adminError.status });
  }

  const eventId = request.nextUrl.searchParams.get('event_id')?.trim();
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'event_id is required' },
      { status: 400 }
    );
  }

  try {
    const event = await getOwnedEventByUserId(auth.userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const stats = await getCheckinStats(eventId);

    return NextResponse.json({
      success: true,
      checkedIn: stats.checkedIn,
      total: stats.total,
    });
  } catch (error) {
    console.error('GET /api/checkin/stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
