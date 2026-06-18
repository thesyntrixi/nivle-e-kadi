export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (typeof body.show_on_website !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'show_on_website must be a boolean' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE card_templates ct
       SET show_on_website = $3
       FROM events e
       JOIN clients c ON e.client_id = c.id
       WHERE ct.id = $1
         AND ct.event_id = e.id
         AND c.user_id = $2
         AND c.is_active = true
       RETURNING ct.*`,
      [params.id, userId, body.show_on_website]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('PATCH /api/cards/[id]/visibility error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update card visibility' },
      { status: 500 }
    );
  }
}
