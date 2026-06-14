export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/staff-auth';
import { deleteStaffUser } from '@/lib/database/queries';

export async function DELETE(
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
    await deleteStaffUser(params.staffId);
    return NextResponse.json({ success: true, message: 'Staff removed' });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete staff' }, { status: 500 });
  }
}
