export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/staff-auth';
import { getUserByEmail, getUserById, updateUserProfile } from '@/lib/database/queries';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone } = await request.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

    const currentUser = await getUserById(auth.userId);
    if (!currentUser || !currentUser.is_active) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (trimmedEmail !== currentUser.email) {
      const existing = await getUserByEmail(trimmedEmail);
      if (existing && existing.id !== auth.userId) {
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 });
      }
    }

    const updated = await updateUserProfile(auth.userId, {
      name: trimmedName || null,
      email: trimmedEmail,
      phone: trimmedPhone || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
