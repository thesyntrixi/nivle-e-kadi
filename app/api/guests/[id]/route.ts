export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Guest } from '@/lib/database/types';

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUEST_STATUSES = ['Pending', 'Sent', 'Delivered', 'Opened', 'Failed'] as const;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedGuest(
  userId: string,
  guestId: string
): Promise<Guest | null> {
  const result = await query(
    `SELECT g.* FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE g.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [guestId, userId]
  );
  return (result.rows[0] as Guest) || null;
}

function validateGuestUpdate(body: {
  name?: string;
  phone?: string;
  email?: string | null;
  status?: string;
  guest_type?: string;
}): string | null {
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name || name.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (name.length > 100) {
      return 'Name must be at most 100 characters';
    }
  }
  if (body.phone !== undefined) {
    const phone = body.phone.trim();
    if (!phone) {
      return 'Phone number is required';
    }
    if (!PHONE_REGEX.test(phone)) {
      return 'Invalid phone number format';
    }
  }
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    const email = String(body.email).trim();
    if (email && !EMAIL_REGEX.test(email)) {
      return 'Invalid email format';
    }
  }
  if (
    body.status !== undefined &&
    !GUEST_STATUSES.includes(body.status as (typeof GUEST_STATUSES)[number])
  ) {
    return 'Invalid status';
  }
  if (
    body.guest_type !== undefined &&
    body.guest_type !== 'single' &&
    body.guest_type !== 'double'
  ) {
    return 'Invalid guest type';
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const guest = await getOwnedGuest(userId, params.id);
    if (!guest) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: guest });
  } catch (error) {
    console.error('GET /api/guests/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load guest. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await getOwnedGuest(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationError = validateGuestUpdate(body);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const phone = body.phone !== undefined ? body.phone.trim() : existing.phone;
    const email =
      body.email !== undefined
        ? body.email
          ? String(body.email).trim()
          : null
        : existing.email;
    const status = body.status ?? existing.status;
    const guestType = body.guest_type ?? existing.guest_type ?? 'single';

    const result = await query(
      `UPDATE guests
       SET name = $2, phone = $3, email = $4, status = $5, guest_type = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [params.id, name, phone, email, status, guestType]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('PUT /api/guests/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update guest. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await getOwnedGuest(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM guests WHERE id = $1', [params.id]);

    await query(
      `UPDATE events SET guest_count = (
         SELECT COUNT(*)::int FROM guests WHERE event_id = $1
       ), updated_at = NOW() WHERE id = $1`,
      [existing.event_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Guest deleted',
    });
  } catch (error) {
    console.error('DELETE /api/guests/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete guest. Please try again.' },
      { status: 500 }
    );
  }
}
