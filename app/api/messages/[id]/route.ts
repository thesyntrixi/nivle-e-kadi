export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Message } from '@/lib/database/types';

const VALID_STATUSES = ['Pending', 'Sent', 'Delivered', 'Failed'] as const;

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedMessage(userId: string, messageId: string) {
  const result = await query(
    `SELECT m.* FROM messages m
     JOIN guests g ON m.guest_id = g.id
     JOIN events e ON m.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE m.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [messageId, userId]
  );
  return (result.rows[0] as Message) || null;
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

    const message = await getOwnedMessage(userId, params.id);
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('GET /api/messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load message. Please try again.' },
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

    const existing = await getOwnedMessage(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    let status = body.status as string;

    // Map Read to Delivered for DB constraint
    if (status === 'Read') status = 'Delivered';

    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE messages
       SET status = $2,
           delivery_status_checked_at = NOW(),
           sent_at = COALESCE(sent_at, NOW())
       WHERE id = $1
       RETURNING *`,
      [params.id, status]
    );

    if (status === 'Delivered') {
      await query(
        `UPDATE guests SET status = 'Delivered', delivered_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [existing.guest_id]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('PUT /api/messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message. Please try again.' },
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

    const existing = await getOwnedMessage(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM messages WHERE id = $1', [params.id]);

    return NextResponse.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error('DELETE /api/messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message. Please try again.' },
      { status: 500 }
    );
  }
}
