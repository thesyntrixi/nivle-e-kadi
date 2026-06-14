export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/staff-auth';
import { getAllStaff } from '@/lib/database/queries';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const adminError = requireAdmin(auth);
  if (adminError) {
    return NextResponse.json({ success: false, error: adminError.error }, { status: adminError.status });
  }

  try {
    const staff = await getAllStaff();
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('List staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list staff' }, { status: 500 });
  }
}
