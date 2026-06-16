export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateGuestQrPng } from '@/lib/guest-qr';

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const invitationCode = decodeURIComponent(params.code).trim();
    if (!invitationCode) {
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    const result = await query(
      'SELECT invitation_code FROM guests WHERE invitation_code = $1',
      [invitationCode]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
    }

    const qrBuffer = await generateGuestQrPng(invitationCode);

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Public QR generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
