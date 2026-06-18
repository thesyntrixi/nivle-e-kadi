export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Event, GuestType } from '@/lib/database/types';
import {
  bulkCreateGuests,
  BulkGuestInsert,
  generateUniqueInvitationCode,
  getEventGuestPhones,
  normalizeBulkImportPhone,
  normalizePhoneForComparison,
  updateEventGuestCount,
} from '@/lib/database/queries';
import { parseHasWhatsappFromImport } from '@/lib/utils/guest-whatsapp';

const NAME_HEADERS = new Set(['jina', 'name']);
const PHONE_HEADERS = new Set(['namba', 'namba ya simu', 'phone']);
const WHATSAPP_HEADERS = new Set(['whatsapp', 'ana whatsapp']);

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedEvent(
  userId: string,
  eventId: string
): Promise<{ id: string; type: Event['type'] } | null> {
  const result = await query(
    `SELECT e.id, e.type FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] || null;
}

function parseSpreadsheet(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  return rows as string[][];
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function findColumns(headerRow: string[]): { nameCol: number; phoneCol: number; whatsappCol: number } | null {
  let nameCol = -1;
  let phoneCol = -1;
  let whatsappCol = -1;

  headerRow.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (NAME_HEADERS.has(header)) nameCol = index;
    if (PHONE_HEADERS.has(header)) phoneCol = index;
    if (WHATSAPP_HEADERS.has(header)) whatsappCol = index;
  });

  if (nameCol < 0 || phoneCol < 0) return null;
  return { nameCol, phoneCol, whatsappCol };
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const eventId = formData.get('event_id');
    const guestTypeRaw = formData.get('guest_type');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Please select a file' }, { status: 400 });
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ success: false, error: 'Event is required' }, { status: 400 });
    }

    const guestType: GuestType =
      guestTypeRaw === 'double' ? 'double' : 'single';

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only .xlsx, .xls, and .csv allowed.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawRows: string[][];

    try {
      rawRows = parseSpreadsheet(buffer);
    } catch (parseError) {
      console.error('Bulk import parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse file. Please check the format.' },
        { status: 400 }
      );
    }

    if (rawRows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'File must contain a header row and at least one data row' },
        { status: 400 }
      );
    }

    const columns = findColumns(rawRows[0].map((cell) => String(cell)));
    if (!columns) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not find Name and Phone columns. Expected headers: Jina/Name and Namba/Phone',
        },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; value: string }> = [];
    const duplicates: Array<{ row: number; name: string; phone: string }> = [];
    const toInsert: BulkGuestInsert[] = [];

    const knownPhones = await getEventGuestPhones(eventId);

    const countResult = await query(
      'SELECT COUNT(*)::int AS count FROM guests WHERE event_id = $1',
      [eventId]
    );
    let sequence = countResult.rows[0].count + 1;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 1;

      if (!row || row.every((cell) => !String(cell ?? '').trim())) {
        continue;
      }

      const name = String(row[columns.nameCol] ?? '').trim();
      const rawPhone = String(row[columns.phoneCol] ?? '').trim();
      const hasWhatsapp =
        columns.whatsappCol >= 0
          ? parseHasWhatsappFromImport(row[columns.whatsappCol])
          : true;

      if (!name) continue;

      const normalizedPhone = normalizeBulkImportPhone(rawPhone);
      if (!normalizedPhone) {
        errors.push({ row: rowNumber, value: rawPhone || '(empty)' });
        continue;
      }

      const comparePhone = normalizePhoneForComparison(normalizedPhone);
      if (knownPhones.has(comparePhone)) {
        duplicates.push({ row: rowNumber, name, phone: normalizedPhone });
        continue;
      }

      knownPhones.add(comparePhone);

      const invitationCode = await generateUniqueInvitationCode(
        eventId,
        event.type,
        sequence
      );
      sequence++;

      toInsert.push({
        event_id: eventId,
        name,
        phone: normalizedPhone,
        guest_type: guestType,
        invitation_code: invitationCode,
        has_whatsapp: hasWhatsapp,
      });
    }

    const inserted = await bulkCreateGuests(toInsert);

    if (inserted > 0) {
      await updateEventGuestCount(eventId);
    }

    return NextResponse.json({
      success: true,
      data: {
        inserted,
        skipped_invalid: errors.length,
        skipped_duplicate: duplicates.length,
        guest_type: guestType,
        errors,
        duplicates,
      },
    });
  } catch (error) {
    console.error('POST /api/guests/bulk-import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import guests. Please try again.' },
      { status: 500 }
    );
  }
}
