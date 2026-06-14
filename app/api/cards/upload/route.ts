export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, 'PNG' | 'JPG' | 'PDF'> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'application/pdf': 'PDF',
};

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
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

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const eventIdRaw = formData.get('event_id');
    const eventId =
      typeof eventIdRaw === 'string' && eventIdRaw.trim()
        ? eventIdRaw.trim()
        : null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Please select a file' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only PNG, JPG, and PDF allowed',
        },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select an event to link this card template',
        },
        { status: 400 }
      );
    }

    if (!(await verifyEventOwnership(userId, eventId))) {
      return NextResponse.json(
        { success: false, error: 'Invalid event selected' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = await put(`cards/${file.name}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });

    let width: number | null = null;
    let height: number | null = null;

    if (fileType !== 'PDF') {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch (metaError) {
        console.error('Image metadata error:', metaError);
      }
    }

    const fileUrl = blob.url;

    const result = await query(
      `INSERT INTO card_templates
         (event_id, original_file_name, file_url, file_type, width, height)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, file.name, fileUrl, fileType, width, height]
    );

    const eventResult = await query(
      `SELECT e.name AS event_name, COALESCE(e.guest_count, 0) AS guest_count
       FROM events e WHERE e.id = $1`,
      [eventId]
    );

    const card = {
      ...result.rows[0],
      event_name: eventResult.rows[0]?.event_name ?? '',
      guest_count: eventResult.rows[0]?.guest_count ?? 0,
      file_size: file.size,
    };

    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (error) {
    console.error('POST /api/cards/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'File upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
