export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireStaff } from '@/lib/staff-auth';
import { getAssignedEvents } from '@/lib/database/queries';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const staffError = requireStaff(auth);
  if (staffError) {
    return NextResponse.json({ success: false, error: staffError.error }, { status: staffError.status });
  }

  try {
    const events = await getAssignedEvents(auth.userId);
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Get assigned events error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}
