export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { requireAuth, requireAdmin } from '@/lib/staff-auth';
import {
  createStaffUser,
  getUserByEmail,
  setStaffEvents,
} from '@/lib/database/queries';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const adminError = requireAdmin(auth);
  if (adminError) {
    return NextResponse.json({ success: false, error: adminError.error }, { status: adminError.status });
  }

  try {
    const { email, password, eventIds } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const staff = await createStaffUser(email, passwordHash);

    if (Array.isArray(eventIds) && eventIds.length > 0) {
      await setStaffEvents(staff.id, eventIds);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create staff' }, { status: 500 });
  }
}
