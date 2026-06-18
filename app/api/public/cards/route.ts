export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://nivle-ekadi.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_request: NextRequest) {
  try {
    const result = await query(
      `SELECT id,
              original_file_name AS name,
              file_url AS image_url,
              created_at
       FROM card_templates
       WHERE show_on_website = true
         AND file_type IN ('PNG', 'JPG')
       ORDER BY created_at DESC`
    );

    return NextResponse.json(result.rows, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('GET /api/public/cards error:', error);
    return NextResponse.json(
      { error: 'Failed to load public cards' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
