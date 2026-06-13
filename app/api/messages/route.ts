import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Message } from '@/lib/database/types';

export type MessageWithGuest = Message & {
  guest_name: string;
  guest_phone: string;
  display_status: string;
};

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

function mapDisplayStatus(
  status: Message['status'],
  guestStatus?: string
): string {
  if (guestStatus === 'Opened' && status === 'Delivered') return 'Read';
  if (guestStatus === 'Opened' && status === 'Sent') return 'Read';
  return status;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const guestId = searchParams.get('guest_id');

    let sql = `
      SELECT m.*, g.name AS guest_name, g.phone AS guest_phone, g.status AS guest_status
      FROM messages m
      JOIN guests g ON m.guest_id = g.id
      JOIN events e ON m.event_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.user_id = $1 AND c.is_active = true
    `;
    const params: string[] = [userId];

    if (guestId) {
      params.push(guestId);
      sql += ` AND m.guest_id = $${params.length}`;
    }
    if (type && (type === 'SMS' || type === 'WhatsApp')) {
      params.push(type);
      sql += ` AND m.message_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND m.status = $${params.length}`;
    }

    sql += guestId
      ? ' ORDER BY m.created_at ASC'
      : ' ORDER BY m.created_at DESC';

    const result = await query(sql, params);

    const data: MessageWithGuest[] = result.rows.map(
      (row: Message & { guest_name: string; guest_phone: string; guest_status: string }) => {
        const { guest_status, ...rest } = row;
        return {
          ...rest,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          display_status: mapDisplayStatus(row.status, guest_status),
        };
      }
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load messages. Please try again.' },
      { status: 500 }
    );
  }
}
