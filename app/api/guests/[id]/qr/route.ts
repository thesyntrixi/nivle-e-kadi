export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'SELECT invitation_code FROM guests WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
    }

    const invitationCode = result.rows[0].invitation_code;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nivle-app-v3.vercel.app';
    const inviteUrl = `${baseUrl}/invite/${invitationCode}`;

    const qrBuffer = await QRCode.toBuffer(inviteUrl, {
      type: 'png',
      width: 400,
      margin: 2,
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
