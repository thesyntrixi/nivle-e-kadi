import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
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

async function getOwnedCard(
  userId: string,
  cardId: string
): Promise<CardWithMeta | null> {
  const result = await query(
    `SELECT ct.*,
            e.name AS event_name,
            COALESCE(e.guest_count, 0) AS guest_count
     FROM card_templates ct
     JOIN events e ON ct.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE ct.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [cardId, userId]
  );

  if (!result.rows[0]) return null;

  const card = result.rows[0] as CardWithMeta;
  card.file_size = await getFileSizeFromUrl(card.file_url);
  return card;
}

async function getFileSizeFromUrl(fileUrl: string): Promise<number | null> {
  try {
    const fs = await import('fs/promises');
    const relative = fileUrl.replace(/^\//, '');
    const filePath = path.join(process.cwd(), 'public', relative);
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

async function verifyEventOwnership(
  userId: string,
  eventId: string
): Promise<boolean> {
  const result = await query(
    `SELECT e.id FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows.length > 0;
}

async function deleteFileFromDisk(fileUrl: string): Promise<void> {
  try {
    const relative = fileUrl.replace(/^\//, '');
    const filePath = path.join(process.cwd(), 'public', relative);
    await unlink(filePath);
  } catch {
    // File may already be removed
  }
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

    const card = await getOwnedCard(userId, params.id);
    if (!card) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('GET /api/cards/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load card. Please try again.' },
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

    const existing = await getOwnedCard(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const eventId = body.event_id;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please select an event to link this card' },
        { status: 400 }
      );
    }

    if (!(await verifyEventOwnership(userId, eventId))) {
      return NextResponse.json(
        { success: false, error: 'Invalid event selected' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE card_templates SET event_id = $2 WHERE id = $1 RETURNING *`,
      [params.id, eventId]
    );

    const updated = await getOwnedCard(userId, result.rows[0].id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/cards/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update card. Please try again.' },
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

    const existing = await getOwnedCard(userId, params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    await deleteFileFromDisk(existing.file_url);
    await query('DELETE FROM card_templates WHERE id = $1', [params.id]);

    return NextResponse.json({
      success: true,
      message: 'Card deleted',
    });
  } catch (error) {
    console.error('DELETE /api/cards/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete card. Please try again.' },
      { status: 500 }
    );
  }
}
