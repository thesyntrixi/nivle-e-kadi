export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { sendSMS } from '@/lib/services/sms';
import { sendWhatsApp } from '@/lib/services/whatsapp';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedGuest(userId: string, guestId: string) {
  const result = await query(
    `SELECT g.id, g.event_id, g.name, g.phone
     FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE g.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [guestId, userId]
  );
  return result.rows[0] as
    | { id: string; event_id: string; name: string; phone: string }
    | undefined;
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

    const body = await request.json();
    const type = body.type as 'SMS' | 'WhatsApp';
    const recipientIds = body.recipient_ids as string[];
    const message = body.message?.trim();

    if (!type || !['SMS', 'WhatsApp'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid message type' },
        { status: 400 }
      );
    }

    if (!recipientIds?.length) {
      return NextResponse.json(
        { success: false, error: 'Select at least one recipient' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const maxLength = type === 'SMS' ? 1600 : 4096;
    if (message.length > maxLength) {
      return NextResponse.json(
        { success: false, error: `Message exceeds ${maxLength} character limit` },
        { status: 400 }
      );
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const guestId of recipientIds) {
      const guest = await getOwnedGuest(userId, guestId);

      if (!guest) {
        failed++;
        errors.push(`Guest ${guestId} not found`);
        continue;
      }

      const sendResult =
        type === 'SMS'
          ? await sendSMS(guest.phone, message)
          : await sendWhatsApp(guest.phone, message);

      const status = sendResult.success ? 'Sent' : 'Failed';

      await query(
        `INSERT INTO messages
           (guest_id, event_id, message_type, content, status, external_message_id, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          guest.id,
          guest.event_id,
          type,
          message,
          status,
          sendResult.externalId ?? null,
          sendResult.success ? new Date() : null,
        ]
      );

      if (sendResult.success) {
        created++;
        await query(
          `UPDATE guests SET status = 'Sent', sent_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND status = 'Pending'`,
          [guest.id]
        );
      } else {
        failed++;
        errors.push(
          `${guest.name}: ${sendResult.error || 'Failed to send'}`
        );
      }
    }

    return NextResponse.json({
      success: created > 0,
      data: { created, failed, errors },
      message:
        created > 0
          ? `Successfully sent ${created} message${created === 1 ? '' : 's'}`
          : 'Failed to send messages',
    });
  } catch (error) {
    console.error('POST /api/messages/send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
