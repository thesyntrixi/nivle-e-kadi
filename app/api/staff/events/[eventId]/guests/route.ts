export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireStaff } from '@/lib/staff-auth';
import {
  getGuestsByEventId,
  isStaffAssignedToEvent,
} from '@/lib/database/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const staffError = requireStaff(auth);
  if (staffError) {
    return NextResponse.json({ success: false, error: staffError.error }, { status: staffError.status });
  }

  const assigned = await isStaffAssignedToEvent(auth.userId, params.eventId);
  if (!assigned) {
    return NextResponse.json(
      { success: false, error: 'Not assigned to this event' },
      { status: 403 }
    );
  }

  try {
    const guests = await getGuestsByEventId(params.eventId);
    return NextResponse.json({ success: true, data: guests });
  } catch (error) {
    console.error('Get event guests error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch guests' }, { status: 500 });
  }
}
