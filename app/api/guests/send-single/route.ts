export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Guest, GuestType } from '@/lib/database/types';
import { markGuestSent } from '@/lib/database/queries';
import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';
import { sendSMS, personalizeGuestMessage } from '@/lib/services/sms';
import { sendWhatsAppInvitation, sendWhatsAppQrCheckin } from '@/lib/services/whatsapp';
import { getPublicGuestQrUrl } from '@/lib/guest-qr';
import {
  formatPhoneForSmsApi,
  formatPhoneForWhatsAppApi,
  normalizePhoneForStorage,
} from '@/lib/utils/phone';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedGuest(userId: string, guestId: string) {
  const result = await query(
    `SELECT g.*
     FROM guests g
     JOIN events e ON g.event_id = e.id
     JOIN clients c ON e.client_id = c.id
     WHERE g.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [guestId, userId]
  );
  return result.rows[0] as Guest | undefined;
}

async function getOwnedEvent(userId: string, eventId: string) {
  const result = await query(
    `SELECT e.id, e.name, e.family_name, e.date, e.time, e.venue, e.location_link
     FROM events e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [eventId, userId]
  );
  return result.rows[0] as
    | {
        id: string;
        name: string;
        family_name: string | null;
        date: string;
        time: string | null;
        venue: string | null;
        location_link: string | null;
      }
    | undefined;
}

function buildSmsInvitationBody(
  eventName: string,
  dateTime: string,
  venue: string,
  locationLink: string
): string {
  const venuePart = venue ? ` Mahali: ${venue}.` : '';
  const mapPart = locationLink ? ` Ramani: ${locationLink}` : '';
  return `Habari {name}, umekaribishwa kwenye ${eventName} ${dateTime}.${venuePart}${mapPart}`;
}

async function insertOutboundMessage(
  guestId: string,
  eventId: string,
  messageType: 'SMS' | 'WhatsApp',
  content: string,
  success: boolean,
  externalId?: string
) {
  await query(
    `INSERT INTO messages
       (guest_id, event_id, message_type, direction, content, status, external_message_id, sent_at)
     VALUES ($1, $2, $3, 'outbound', $4, $5, $6, $7)`,
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

async function uploadGuestCard(file: File, guestId: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Invalid file type. Only PNG and JPG allowed');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`guest-cards/${guestId}/${file.name}`, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
  });

  return blob.url;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let guestId: string | undefined;
    let cardImageUrl: string | undefined;

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const guestIdRaw = formData.get('guest_id');
      const file = formData.get('file');

      if (typeof guestIdRaw !== 'string' || !guestIdRaw.trim()) {
        return NextResponse.json(
          { success: false, error: 'guest_id is required' },
          { status: 400 }
        );
      }

      guestId = guestIdRaw.trim();

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'Card image file is required' },
          { status: 400 }
        );
      }

      try {
        cardImageUrl = await uploadGuestCard(file, guestId);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Upload failed';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }
    } else {
      const body = await request.json();
      guestId = body.guest_id?.trim();
      cardImageUrl = body.card_image_url?.trim();

      if (!guestId) {
        return NextResponse.json(
          { success: false, error: 'guest_id is required' },
          { status: 400 }
        );
      }

      if (!cardImageUrl) {
        return NextResponse.json(
          { success: false, error: 'card_image_url is required' },
          { status: 400 }
        );
      }
    }

    const guest = await getOwnedGuest(userId, guestId);
    if (!guest) {
      return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
    }

    const event = await getOwnedEvent(userId, guest.event_id);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const formattedDateTime = formatSwahiliDateTime(event.date, event.time);
    const venue = event.venue ?? '';
    const locationLink = event.location_link ?? '';
    const guestType = (guest.guest_type ?? 'single') as GuestType;
    const normalizedStored = normalizePhoneForStorage(guest.phone);
    if (!normalizedStored) {
      return NextResponse.json(
        { success: false, error: 'Invalid guest phone number format' },
        { status: 400 }
      );
    }

    const smsPhone = formatPhoneForSmsApi(normalizedStored);
    const whatsAppPhone = formatPhoneForWhatsAppApi(normalizedStored);

    console.log('Single send phone debug', {
      guestId: guest.id,
      storedInDb: guest.phone,
      normalizedStored,
      smsApiPhone: smsPhone,
      whatsAppApiPhone: whatsAppPhone,
    });

    const smsTemplate = buildSmsInvitationBody(
      event.name,
      formattedDateTime,
      venue,
      locationLink
    );

    let smsSent = false;
    let whatsappSent = false;
    let lastError = '';
    let smsExternalId: string | undefined;
    let whatsappExternalId: string | undefined;

    const personalizedSmsContent = personalizeGuestMessage(
      smsTemplate,
      guest.name,
      guestType
    );
    const whatsappLogContent = `Mwaliko wa ${event.name} — ${formattedDateTime}`;

    try {
      console.log('Single send SMS API phone:', smsPhone);
      const smsResult = await sendSMS(smsPhone, smsTemplate, {
        guestName: guest.name,
        guestType,
      });
      smsSent = smsResult.success;
      smsExternalId = smsResult.externalId;
      if (!smsResult.success && smsResult.error) {
        lastError = smsResult.error;
      }
    } catch (err) {
      console.error('Single send SMS error:', err);
      lastError = 'SMS send failed';
    }

    const hostName = event.family_name?.trim() || event.name;

    try {
      console.log('Single send WhatsApp API phone:', whatsAppPhone);
      const waResponse = await sendWhatsAppInvitation(whatsAppPhone, {
        guestName: guest.name,
        guestType,
        eventName: event.name,
        familyName: hostName,
        dateTime: formattedDateTime,
        venue: venue || 'TBA',
        locationLink,
        headerImageUrl: cardImageUrl,
      });
      whatsappSent = true;
      whatsappExternalId = waResponse?.messages?.[0]?.id;

      try {
        const qrImageUrl = getPublicGuestQrUrl(guest.invitation_code);
        await sendWhatsAppQrCheckin(whatsAppPhone, {
          guestName: guest.name,
          guestType,
          headerImageUrl: qrImageUrl,
        });
        console.log('Single send WhatsApp QR checkin sent', {
          guestId: guest.id,
          qrImageUrl,
        });
      } catch (qrErr) {
        console.error('Single send WhatsApp QR checkin failed (non-fatal):', qrErr);
      }
    } catch (err) {
      console.error('Single send WhatsApp error:', err);
      if (!lastError) {
        lastError = err instanceof Error ? err.message : 'WhatsApp send failed';
      }
    }

    if (smsSent) {
      await insertOutboundMessage(
        guest.id,
        guest.event_id,
        'SMS',
        personalizedSmsContent,
        true,
        smsExternalId
      );
    }

    if (whatsappSent) {
      await insertOutboundMessage(
        guest.id,
        guest.event_id,
        'WhatsApp',
        whatsappLogContent,
        true,
        whatsappExternalId
      );
    }

    const overallSuccess = smsSent || whatsappSent;
    const updatedGuest = await markGuestSent(guest.id, overallSuccess);

    if (overallSuccess && cardImageUrl) {
      await query(
        `UPDATE guests SET personalized_card_url = $2, updated_at = NOW() WHERE id = $1`,
        [guest.id, cardImageUrl]
      );
    }

    return NextResponse.json({
      success: overallSuccess,
      sms_sent: smsSent,
      whatsapp_sent: whatsappSent,
      guest_status: updatedGuest.status,
      card_image_url: cardImageUrl,
      error: overallSuccess ? undefined : lastError || 'Failed to send invitation',
    });
  } catch (error) {
    console.error('POST /api/guests/send-single error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
