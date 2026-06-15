export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { getGuestsByEventId } from '@/lib/database/queries';
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
    `SELECT g.id, g.event_id, g.name, g.phone, g.guest_type
     FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE g.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [guestId, userId]
  );
  return result.rows[0] as
    | { id: string; event_id: string; name: string; phone: string; guest_type: 'single' | 'double' }
    | undefined;
}

async function getOwnedEvent(userId: string, eventId: string) {
  const result = await query(
    `SELECT e.id FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] as { id: string } | undefined;
}

function isOutside24hWindow(error?: string): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes('24 hour') ||
    lower.includes('24-hour') ||
    lower.includes('re-engagement') ||
    lower.includes('131047') ||
    lower.includes('131026') ||
    lower.includes('session') ||
    lower.includes('outside the allowed')
  );
}

async function insertMessageRecord(
  guestId: string,
  eventId: string,
  messageType: 'SMS' | 'WhatsApp',
  content: string,
  success: boolean,
  externalId?: string
) {
  await query(
    `INSERT INTO messages
       (guest_id, event_id, message_type, content, status, external_message_id, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      guestId,
      eventId,
      messageType,
      content,
      success ? 'Sent' : 'Failed',
      externalId ?? null,
      success ? new Date() : null,
    ]
  );
}

async function handleBulkDualSend(userId: string, eventId: string, message: string) {
  const event = await getOwnedEvent(userId, eventId);
  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  const guests = await getGuestsByEventId(eventId);
  const total = guests.length;

  if (total === 0) {
    return NextResponse.json(
      { success: false, error: 'No guests found for this event' },
      { status: 400 }
    );
  }

  let smsSent = 0;
  let smsFailed = 0;
  let whatsappSent = 0;
  let whatsappOutside24h = 0;
  let whatsappFailed = 0;
  const smsErrors: string[] = [];

  for (const guest of guests) {
    const guestOpts = {
      guestName: guest.name,
      guestType: (guest.guest_type ?? 'single') as 'single' | 'double',
    };

    const smsResult = await sendSMS(guest.phone, message, guestOpts);
    await insertMessageRecord(
      guest.id,
      eventId,
      'SMS',
      message,
      smsResult.success,
      smsResult.externalId
    );

    if (smsResult.success) {
      smsSent++;
      await query(
        `UPDATE guests SET status = 'Sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'Pending'`,
        [guest.id]
      );
    } else {
      smsFailed++;
      smsErrors.push(`${guest.name}: ${smsResult.error || 'Failed to send SMS'}`);
    }

    const waResult = await sendWhatsApp(guest.phone, message, guestOpts);
    await insertMessageRecord(
      guest.id,
      eventId,
      'WhatsApp',
      message,
      waResult.success,
      waResult.externalId
    );

    if (waResult.success) {
      whatsappSent++;
    } else if (isOutside24hWindow(waResult.error)) {
      whatsappOutside24h++;
    } else {
      whatsappFailed++;
    }
  }

  const whatsappNote =
    whatsappOutside24h > 0 ? ' (wengine nje ya muda wa masaa 24)' : '';

  return NextResponse.json({
    success: smsSent > 0,
    data: {
      total,
      sms_sent: smsSent,
      sms_failed: smsFailed,
      whatsapp_sent: whatsappSent,
      whatsapp_outside_24h: whatsappOutside24h,
      whatsapp_failed: whatsappFailed,
      sms_errors: smsErrors,
    },
    message: `SMS: ${smsSent}/${total} zimetumwa ✅\nWhatsApp: ${whatsappSent}/${total} zimetumwa${whatsappNote} ℹ️`,
  });
}

async function handleSingleChannelSend(
  userId: string,
  type: 'SMS' | 'WhatsApp',
  recipientIds: string[],
  message: string
) {
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
        ? await sendSMS(guest.phone, message, {
            guestName: guest.name,
            guestType: guest.guest_type ?? 'single',
          })
        : await sendWhatsApp(guest.phone, message, {
            guestName: guest.name,
            guestType: guest.guest_type ?? 'single',
          });

    await insertMessageRecord(
      guest.id,
      guest.event_id,
      type,
      message,
      sendResult.success,
      sendResult.externalId
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
      errors.push(`${guest.name}: ${sendResult.error || 'Failed to send'}`);
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
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const type = body.type as 'SMS' | 'WhatsApp' | undefined;

    if (!type) {
      const eventId = body.event_id?.trim();
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }
      if (message.length > 160) {
        return NextResponse.json(
          { success: false, error: 'Message exceeds 160 character limit' },
          { status: 400 }
        );
      }
      return handleBulkDualSend(userId, eventId, message);
    }

    if (!['SMS', 'WhatsApp'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid message type' },
        { status: 400 }
      );
    }

    const recipientIds = body.recipient_ids as string[];
    if (!recipientIds?.length) {
      return NextResponse.json(
        { success: false, error: 'Select at least one recipient' },
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

    return handleSingleChannelSend(userId, type, recipientIds, message);
  } catch (error) {
    console.error('POST /api/messages/send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
