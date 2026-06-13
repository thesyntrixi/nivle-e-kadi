export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { createGuest } from '@/lib/database/queries';
import { Event } from '@/lib/database/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ColumnMapping {
  nameColumn: number;
  phoneColumn: number;
  emailColumn?: number;
  hasHeader?: boolean;
}

interface ParsedRow {
  rowNumber: number;
  name: string;
  phone: string;
  email: string | null;
}

interface RowError {
  row: number;
  message: string;
}

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function verifyEventOwnership(
  userId: string,
  eventId: string
): Promise<{ id: string; type: Event['type']; name: string } | null> {
  const result = await query(
    `SELECT e.id, e.type, e.name FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] || null;
}

function getCodePrefix(eventType: Event['type']): string {
  const prefixes: Record<Event['type'], string> = {
    Wedding: 'WED',
    Birthday: 'BDA',
    Conference: 'CON',
    Corporate: 'COR',
    Other: 'EVT',
  };
  return prefixes[eventType] || 'EVT';
}

function parseSpreadsheet(
  buffer: Buffer,
  fileName: string
): string[][] {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      throw new Error('Failed to parse CSV file');
    }
    return parsed.data;
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  return rows as string[][];
}

function extractRows(
  rawRows: string[][],
  mapping: ColumnMapping
): { rows: ParsedRow[]; errors: RowError[] } {
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const startIndex = mapping.hasHeader ? 1 : 0;

  for (let i = startIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 1;

    if (!row || row.every((cell) => !String(cell ?? '').trim())) {
      continue;
    }

    const name = String(row[mapping.nameColumn] ?? '').trim();
    const phone = String(row[mapping.phoneColumn] ?? '').trim();
    const emailCol = mapping.emailColumn;
    const email =
      emailCol !== undefined && emailCol >= 0
        ? String(row[emailCol] ?? '').trim() || null
        : null;

    if (!name) {
      errors.push({ row: rowNumber, message: 'Name is empty' });
      continue;
    }
    if (name.length < 2 || name.length > 100) {
      errors.push({ row: rowNumber, message: 'Name must be 2-100 characters' });
      continue;
    }
    if (!phone) {
      errors.push({ row: rowNumber, message: 'Phone is required' });
      continue;
    }
    if (!PHONE_REGEX.test(phone)) {
      errors.push({ row: rowNumber, message: 'Invalid phone number format' });
      continue;
    }
    if (email && !EMAIL_REGEX.test(email)) {
      errors.push({ row: rowNumber, message: 'Invalid email format' });
      continue;
    }

    rows.push({ rowNumber, name, phone, email });
  }

  return { rows, errors };
}

async function isDuplicate(
  eventId: string,
  name: string,
  phone: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM guests
     WHERE event_id = $1 AND LOWER(name) = LOWER($2) AND phone = $3`,
    [eventId, name, phone]
  );
  return result.rows.length > 0;
}

async function generateUniqueCode(
  eventId: string,
  eventType: Event['type'],
  sequence: number
): Promise<string> {
  const prefix = getCodePrefix(eventType);
  let attempt = sequence;

  for (let i = 0; i < 100; i++) {
    const code = `${prefix}-${String(attempt).padStart(5, '0')}`;
    const existing = await query(
      'SELECT id FROM guests WHERE invitation_code = $1',
      [code]
    );
    if (existing.rows.length === 0) {
      return code;
    }
    attempt++;
  }

  const fallback = `${prefix}-${eventId.slice(0, 4).toUpperCase()}-${Date.now().toString(36)}`;
  return fallback.slice(0, 20);
}

async function updateEventGuestCount(eventId: string): Promise<void> {
  await query(
    `UPDATE events SET guest_count = (
       SELECT COUNT(*)::int FROM guests WHERE event_id = $1
     ), updated_at = NOW() WHERE id = $1`,
    [eventId]
  );
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
    const eventId = formData.get('event_id');
    const mappingRaw = formData.get('column_mapping');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Please select a file' },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Event is required' },
        { status: 400 }
      );
    }

    const event = await verifyEventOwnership(userId, eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only CSV and Excel allowed.' },
        { status: 400 }
      );
    }

    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(
        typeof mappingRaw === 'string' ? mappingRaw : '{}'
      ) as ColumnMapping;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid column mapping' },
        { status: 400 }
      );
    }

    if (mapping.nameColumn === undefined || mapping.phoneColumn === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name and phone columns are required' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawRows: string[][];

    try {
      rawRows = parseSpreadsheet(buffer, file.name);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse file. Please check the format.' },
        { status: 400 }
      );
    }

    const { rows, errors } = extractRows(rawRows, mapping);

    if (rows.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid guest rows found in file',
        data: { created: 0, skipped: 0, errors },
      });
    }

    const countResult = await query(
      'SELECT COUNT(*)::int AS count FROM guests WHERE event_id = $1',
      [eventId]
    );
    let sequence = countResult.rows[0].count + 1;

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      if (await isDuplicate(eventId, row.name, row.phone)) {
        skipped++;
        errors.push({
          row: row.rowNumber,
          message: 'Duplicate guest (same name and phone)',
        });
        continue;
      }

      const invitationCode = await generateUniqueCode(
        eventId,
        event.type,
        sequence
      );
      sequence++;

      try {
        await createGuest({
          event_id: eventId,
          name: row.name,
          phone: row.phone,
          email: row.email,
          invitation_code: invitationCode,
          qr_code_url: null,
          personalized_card_url: null,
          sent_at: null,
          delivered_at: null,
          opened_at: null,
          status: 'Pending',
        });
        created++;
      } catch (insertError) {
        console.error('Insert guest error:', insertError);
        errors.push({
          row: row.rowNumber,
          message: 'Failed to insert guest',
        });
      }
    }

    await updateEventGuestCount(eventId);

    return NextResponse.json({
      success: true,
      data: { created, skipped, errors },
    });
  } catch (error) {
    console.error('POST /api/guests/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import guests. Please try again.' },
      { status: 500 }
    );
  }
}
