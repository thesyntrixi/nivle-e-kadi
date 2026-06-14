export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireStaff } from '@/lib/staff-auth';
import {
  checkInGuestForEvent,
  isStaffAssignedToEvent,
} from '@/lib/database/queries';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const staffError = requireStaff(auth);
  if (staffError) {
    return NextResponse.json({ success: false, error: staffError.error }, { status: staffError.status });
  }

  try {
    const { code, eventId } = await request.json();

    if (!code || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Code and eventId required' },
        { status: 400 }
      );
    }

    const assigned = await isStaffAssignedToEvent(auth.userId, eventId);
    if (!assigned) {
      return NextResponse.json(
        { success: false, error: 'Not assigned to this event' },
        { status: 403 }
      );
    }

    const result = await checkInGuestForEvent(code.trim(), eventId);

    if (!result.found) {
      return NextResponse.json(
        { success: false, error: 'Invalid code - guest not found for this event' },
        { status: 404 }
      );
    }

    if (result.alreadyCheckedIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        data: result.guest,
        message: `${result.guest.name} already checked in`,
      });
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      data: result.guest,
      message: `${result.guest.name} checked in successfully!`,
    });
  } catch (error) {
    console.error('Staff check-in error:', error);
    return NextResponse.json({ success: false, error: 'Check-in failed' }, { status: 500 });
  }
}
