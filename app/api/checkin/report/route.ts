export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/staff-auth';
import {
  getCheckinReportGuests,
  getCheckinStats,
  getOwnedEventByUserId,
} from '@/lib/database/queries';
import { generateCheckinReportPdf } from '@/lib/services/checkin-report-pdf';
import { sendCheckinReport } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const adminError = requireAdmin(auth);
  if (adminError) {
    return NextResponse.json({ success: false, error: adminError.error }, { status: adminError.status });
  }

  try {
    const body = await request.json();
    const eventId = body.event_id?.trim();

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      );
    }

    const event = await getOwnedEventByUserId(auth.userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const [stats, guests] = await Promise.all([
      getCheckinStats(eventId),
      getCheckinReportGuests(eventId),
    ]);

    const pdfBuffer = generateCheckinReportPdf(event, guests, stats);
    const emailResult = await sendCheckinReport(event.name, pdfBuffer);

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: emailResult.error || 'Failed to send report email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ripoti imetumwa kwa nivle.ekadi@gmail.com',
    });
  } catch (error) {
    console.error('POST /api/checkin/report error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate or send report' },
      { status: 500 }
    );
  }
}
