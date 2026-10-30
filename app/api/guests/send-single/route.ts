export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { Guest, GuestType } from '@/lib/database/types';
import { markGuestSent } from '@/lib/database/queries';
import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';
import {
  sendSMS,
  personalizeGuestMessage,
  formatGuestDisplayName,
} from '@/lib/services/sms';
import { sendWhatsAppInvitation } from '@/lib/services/whatsapp';
import {
  formatPhoneForSmsApi,
  formatPhoneForWhatsAppApi,
  normalizePhoneForStorage,
} from '@/lib/utils/phone';
import { guestHasWhatsApp } from '@/lib/utils/guest-whatsapp';
import { generateCardWithQR } from '@/lib/utils/card-with-qr';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const WHATSAPP_API_VERSION = 'v21.0';

type SendChannel = 'whatsapp' | 'sms' | 'both';

type GuestSendResult = {
  guest_id: string;
  guest_name: string;
  success: boolean;
  sms_sent: boolean;
  whatsapp_sent: boolean;
  guest_status?: string;
  card_image_url?: string;
  error?: string;
};

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

function parseChannel(value: unknown): SendChannel {
  if (value === 'whatsapp' || value === 'sms' || value === 'both') {
    return value;
  }
  return 'both';
}

function parseGuestIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((id) => String(id).trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return trimmed
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
}

function applyCustomMessage(
  template: string,
  guestName: string,
  guestType: GuestType
): string {
  const displayName = formatGuestDisplayName(guestName, guestType);
  return template.replace(/\[JINA\]/gi, displayName);
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

async function overlayQrOnCard(
  cardImageUrl: string,
  guest: Guest
): Promise<string> {
  const cardWithQr = await generateCardWithQR(cardImageUrl, guest.invitation_code);
  if (!cardWithQr) {
    return cardImageUrl;
  }

  try {
    const qrCardBlob = await put(`cards/qr-${guest.id}-${Date.now()}.png`, cardWithQr, {
      access: 'public',
      contentType: 'image/png',
    });
    return qrCardBlob.url;
  } catch (uploadErr) {
    console.error('Failed to upload card with QR overlay:', uploadErr);
    return cardImageUrl;
  }
}

async function sendWhatsAppImageWithCaption(
  to: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    return { success: false, error: 'WhatsApp service is not configured' };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption.substring(0, 1024),
        },
      }),
    }
  );

  const responseData = await response.json();
  console.log('WhatsApp custom image response', {
    channel: 'whatsapp',
    status: response.status,
    messageId: responseData?.messages?.[0]?.id,
    code: responseData?.error?.code,
    title: responseData?.error?.type || responseData?.error?.error_user_title,
  });

  if (!response.ok) {
    const errMsg =
      responseData?.error?.message ||
      JSON.stringify(responseData) ||
      'WhatsApp image send failed';
    return { success: false, error: errMsg };
  }

  return {
    success: true,
    externalId: responseData?.messages?.[0]?.id,
  };
}

async function sendToGuest(params: {
  userId: string;
  guestId: string;
  cardImageUrl?: string;
  customMessage?: string;
  channel: SendChannel;
}): Promise<GuestSendResult> {
  const guest = await getOwnedGuest(params.userId, params.guestId);
  if (!guest) {
    return {
      guest_id: params.guestId,
      guest_name: '',
      success: false,
      sms_sent: false,
      whatsapp_sent: false,
      error: 'Guest not found',
    };
  }

  const event = await getOwnedEvent(params.userId, guest.event_id);
  if (!event) {
    return {
      guest_id: guest.id,
      guest_name: guest.name,
      success: false,
      sms_sent: false,
      whatsapp_sent: false,
      error: 'Event not found',
    };
  }

  const formattedDateTime = formatSwahiliDateTime(event.date, event.time);
  const venue = event.venue ?? '';
  const locationLink = event.location_link ?? '';
  const guestType = (guest.guest_type ?? 'single') as GuestType;
  const normalizedStored = normalizePhoneForStorage(guest.phone);
  if (!normalizedStored) {
    return {
      guest_id: guest.id,
      guest_name: guest.name,
      success: false,
      sms_sent: false,
      whatsapp_sent: false,
      error: 'Invalid guest phone number format',
    };
  }

  const smsPhone = formatPhoneForSmsApi(normalizedStored);
  const whatsAppPhone = formatPhoneForWhatsAppApi(normalizedStored);
  const wantsSms = params.channel === 'sms' || params.channel === 'both';
  const wantsWhatsApp = params.channel === 'whatsapp' || params.channel === 'both';
  const canSendWhatsApp = wantsWhatsApp && guestHasWhatsApp(guest.has_whatsapp);
  const hasCustomMessage = Boolean(params.customMessage?.trim());

  if (wantsWhatsApp && !params.cardImageUrl) {
    return {
      guest_id: guest.id,
      guest_name: guest.name,
      success: false,
      sms_sent: false,
      whatsapp_sent: false,
      error: 'card_image_url is required',
    };
  }

  let smsSent = false;
  let whatsappSent = false;
  let lastError = '';
  let smsExternalId: string | undefined;
  let whatsappExternalId: string | undefined;

  const personalizedCustom = hasCustomMessage
    ? applyCustomMessage(params.customMessage!.trim(), guest.name, guestType)
    : '';

  const smsTemplate = hasCustomMessage
    ? personalizedCustom
    : buildSmsInvitationBody(event.name, formattedDateTime, venue, locationLink);

  const personalizedSmsContent = hasCustomMessage
    ? personalizedCustom
    : personalizeGuestMessage(smsTemplate, guest.name, guestType);

  const whatsappLogContent = hasCustomMessage
    ? personalizedCustom
    : `Mwaliko wa ${event.name} — ${formattedDateTime}`;

  if (wantsSms) {
    try {
      console.log('Single send SMS', {
        channel: 'sms',
        guestId: guest.id,
        eventId: guest.event_id,
        phone: `***${smsPhone.slice(-3)}`,
      });
      const smsResult = hasCustomMessage
        ? await sendSMS(smsPhone, personalizedCustom)
        : await sendSMS(smsPhone, smsTemplate, {
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
  }

  const hostName = event.family_name?.trim() || event.name;
  let whatsappHeaderImageUrl = params.cardImageUrl;

  if (canSendWhatsApp && params.cardImageUrl) {
    whatsappHeaderImageUrl = await overlayQrOnCard(params.cardImageUrl, guest);
  }

  if (canSendWhatsApp && whatsappHeaderImageUrl) {
    try {
      console.log('Single send WhatsApp', {
        channel: 'whatsapp',
        guestId: guest.id,
        eventId: guest.event_id,
        phone: `***${whatsAppPhone.slice(-3)}`,
      });

      if (hasCustomMessage) {
        const imageResult = await sendWhatsAppImageWithCaption(
          whatsAppPhone,
          whatsappHeaderImageUrl,
          personalizedCustom
        );
        if (imageResult.success) {
          whatsappSent = true;
          whatsappExternalId = imageResult.externalId;
        } else {
          const waResponse = await sendWhatsAppInvitation(whatsAppPhone, {
            guestName: guest.name,
            guestType,
            eventName: event.name,
            familyName: hostName,
            dateTime: formattedDateTime,
            venue: venue || 'TBA',
            locationLink,
            headerImageUrl: whatsappHeaderImageUrl,
          });
          whatsappSent = true;
          whatsappExternalId = waResponse?.messages?.[0]?.id;
        }
      } else {
        const waResponse = await sendWhatsAppInvitation(whatsAppPhone, {
          guestName: guest.name,
          guestType,
          eventName: event.name,
          familyName: hostName,
          dateTime: formattedDateTime,
          venue: venue || 'TBA',
          locationLink,
          headerImageUrl: whatsappHeaderImageUrl,
        });
        whatsappSent = true;
        whatsappExternalId = waResponse?.messages?.[0]?.id;
      }
    } catch (err) {
      console.error('Single send WhatsApp error:', err);
      if (!lastError) {
        lastError = err instanceof Error ? err.message : 'WhatsApp send failed';
      }
    }
  } else if (wantsWhatsApp && !guestHasWhatsApp(guest.has_whatsapp)) {
    if (!lastError) {
      lastError = 'Mgeni hana WhatsApp — SMS tu';
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

  if (overallSuccess && whatsappHeaderImageUrl) {
    await query(
      `UPDATE guests SET personalized_card_url = $2, updated_at = NOW() WHERE id = $1`,
      [guest.id, whatsappHeaderImageUrl]
    );
  }

  return {
    guest_id: guest.id,
    guest_name: guest.name,
    success: overallSuccess,
    sms_sent: smsSent,
    whatsapp_sent: whatsappSent,
    guest_status: updatedGuest.status,
    card_image_url: params.cardImageUrl,
    error: overallSuccess ? undefined : lastError || 'Failed to send invitation',
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let guestIds: string[] = [];
    let cardImageUrl: string | undefined;
    let customMessage: string | undefined;
    let channel: SendChannel = 'both';

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const guestIdRaw = formData.get('guest_id');
      const guestIdsRaw = formData.get('guest_ids');
      const file = formData.get('file');
      const cardUrlRaw = formData.get('card_image_url');
      const customRaw = formData.get('custom_message');
      const channelRaw = formData.get('channel');

      if (typeof guestIdRaw === 'string' && guestIdRaw.trim()) {
        guestIds.push(guestIdRaw.trim());
      }
      guestIds.push(...parseGuestIds(typeof guestIdsRaw === 'string' ? guestIdsRaw : ''));
      guestIds = Array.from(new Set(guestIds));

      if (typeof customRaw === 'string' && customRaw.trim()) {
        customMessage = customRaw;
      }
      channel = parseChannel(typeof channelRaw === 'string' ? channelRaw : undefined);

      if (typeof cardUrlRaw === 'string' && cardUrlRaw.trim()) {
        cardImageUrl = cardUrlRaw.trim();
      }

      if (file instanceof File) {
        const uploadFor = guestIds[0] ?? 'shared';
        try {
          cardImageUrl = await uploadGuestCard(file, uploadFor);
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : 'Upload failed';
          return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
      }
    } else {
      const body = await request.json();
      if (typeof body.guest_id === 'string' && body.guest_id.trim()) {
        guestIds.push(body.guest_id.trim());
      }
      guestIds.push(...parseGuestIds(body.guest_ids));
      guestIds = Array.from(new Set(guestIds));
      cardImageUrl = typeof body.card_image_url === 'string' ? body.card_image_url.trim() : undefined;
      customMessage =
        typeof body.custom_message === 'string' && body.custom_message.trim()
          ? body.custom_message
          : undefined;
      channel = parseChannel(body.channel);
    }

    if (guestIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'guest_id is required' },
        { status: 400 }
      );
    }

    const needsCard = channel === 'whatsapp' || channel === 'both';
    if (needsCard && !cardImageUrl) {
      return NextResponse.json(
        { success: false, error: 'card_image_url is required' },
        { status: 400 }
      );
    }

    const results: GuestSendResult[] = [];
    for (const guestId of guestIds) {
      const result = await sendToGuest({
        userId,
        guestId,
        cardImageUrl,
        customMessage,
        channel,
      });
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;
    const first = results[0];
    const overallSuccess = succeeded > 0;

    if (results.length === 1) {
      return NextResponse.json({
        success: first.success,
        sms_sent: first.sms_sent,
        whatsapp_sent: first.whatsapp_sent,
        guest_status: first.guest_status,
        card_image_url: cardImageUrl ?? first.card_image_url,
        error: first.error,
        results,
      });
    }

    return NextResponse.json({
      success: overallSuccess,
      sms_sent: results.some((r) => r.sms_sent),
      whatsapp_sent: results.some((r) => r.whatsapp_sent),
      card_image_url: cardImageUrl ?? results.find((r) => r.card_image_url)?.card_image_url,
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
      },
      error: overallSuccess ? undefined : first?.error || 'Failed to send invitation',
    });
  } catch (error) {
    console.error('POST /api/guests/send-single error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
