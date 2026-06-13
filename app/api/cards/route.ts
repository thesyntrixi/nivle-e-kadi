import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { CardTemplate } from '@/lib/database/types';

type CardWithMeta = CardTemplate & {
  event_name: string;
  guest_count: number;
  file_size: number | null;
};

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
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
    const eventId = searchParams.get('event_id');

    let sql = `
      SELECT ct.*,
             e.name AS event_name,
             COALESCE(e.guest_count, 0) AS guest_count
      FROM card_templates ct
      JOIN events e ON ct.event_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.user_id = $1 AND c.is_active = true
    `;
    const params: string[] = [userId];

    if (eventId) {
      params.push(eventId);
      sql += ` AND ct.event_id = $${params.length}`;
    }

    sql += ' ORDER BY ct.created_at DESC';

    const result = await query(sql, params);

    const cards = await Promise.all(
      (result.rows as CardWithMeta[]).map(async (card) => ({
        ...card,
        file_size: await getFileSizeFromUrl(card.file_url),
      }))
    );

    return NextResponse.json({ success: true, data: cards });
  } catch (error) {
    console.error('GET /api/cards error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load cards. Please try again.' },
      { status: 500 }
    );
  }
}

async function getFileSizeFromUrl(fileUrl: string): Promise<number | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const relative = fileUrl.replace(/^\//, '');
    const filePath = path.join(process.cwd(), 'public', relative);
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}
