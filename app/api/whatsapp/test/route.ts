export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppHelloWorld } from '@/lib/services/whatsapp';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing "to" query parameter (phone number with country code, e.g. +255712345678)',
        },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppHelloWorld(to);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('WhatsApp test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
