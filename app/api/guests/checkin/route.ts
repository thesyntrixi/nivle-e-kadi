export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const result = await query(
      `SELECT g.id, g.name, g.invitation_code, g.checked_in, g.checked_in_at, g.guest_type, e.name AS event_name
       FROM guests g
       LEFT JOIN events e ON g.event_id = e.id
       WHERE g.invitation_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid code - guest not found' },
        { status: 404 }
      );
    }

    const guest = result.rows[0];

    if (guest.checked_in) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        data: guest,
        message: `${guest.name} already checked in at ${guest.checked_in_at}`,
      });
    }

    const updateResult = await query(
      `UPDATE guests SET checked_in = TRUE, checked_in_at = NOW()
       WHERE invitation_code = $1
       RETURNING id, name, invitation_code, checked_in, checked_in_at, guest_type`,
      [code]
    );

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      data: { ...updateResult.rows[0], event_name: guest.event_name },
      message: `${guest.name} checked in successfully!`,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ success: false, error: 'Check-in failed' }, { status: 500 });
  }
}
