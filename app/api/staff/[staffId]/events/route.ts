export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/staff-auth';
import {
  assignEventToStaff,
  removeEventFromStaff,
  setStaffEvents,
} from '@/lib/database/queries';

export async function PUT(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const adminError = requireAdmin(auth);
  if (adminError) {
    return NextResponse.json({ success: false, error: adminError.error }, { status: adminError.status });
  }

  try {
    const body = await request.json();
    const { assign, remove, eventIds } = body;

    if (Array.isArray(eventIds)) {
      await setStaffEvents(params.staffId, eventIds);
      return NextResponse.json({ success: true, message: 'Events updated' });
    }

    if (assign) {
      await assignEventToStaff(params.staffId, assign);
    }

    if (remove) {
      await removeEventFromStaff(params.staffId, remove);
    }

    if (!assign && !remove && !eventIds) {
      return NextResponse.json(
        { success: false, error: 'Provide assign, remove, or eventIds' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Events updated' });
  } catch (error) {
    console.error('Update staff events error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update events' }, { status: 500 });
  }
}
