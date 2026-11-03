export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/token';
import { query } from '@/lib/db';
import { GuestType } from '@/lib/database/types';
import {
  getEventCardImageUrl,
  getGuestsToSend,
  getPendingCounts,
  markGuestSent,
} from '@/lib/database/queries';
import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';
import { personalizeGuestMessage, sendSMS } from '@/lib/services/sms';
import { sendWhatsAppInvitation } from '@/lib/services/whatsapp';
import {
  isTemplateApproved,
  resolveWhatsAppTemplate,
  whatsAppTemplateLanguage,
} from '@/lib/whatsapp-templates';
import { guestHasWhatsApp } from '@/lib/utils/guest-whatsapp';

const GUEST_DELAY_MS = 400;
const DEFAULT_BATCH_SIZE = 10;
const WHATSAPP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const TEMPLATE_NOT_USABLE_REASON =
  "Aina hii ya tukio haina template ya WhatsApp iliyokubaliwa. Tumia 'Tuma kwa Mtu Mmoja' kwa SMS, au subiri template ikubaliwe.";
const CARD_TOO_LARGE_REASON =
  'Kadi ni kubwa kuliko 5MB au ukubwa haujulikani. Punguza ukubwa na ujaribu tena.';
const SMS_SEND_FAILED_REASON = 'SMS imeshindwa kutumwa';
const SMS_TOO_LONG_REASON = 'Ujumbe ni mrefu sana (zaidi ya herufi 918)';
const WHATSAPP_SEND_FAILED_REASON = 'WhatsApp imeshindwa kutumwa';

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function getOwnedEvent(userId: string, eventId: string) {
  const result = await query(
    `SELECT e.id, e.name, e.family_name, e.type, e.date, e.time, e.venue, e.location_link
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
        type: string;
        date: string;
        time: string | null;
        venue: string | null;
        location_link: string | null;
      }
    | undefined;
}

function formatPhoneForSending(phone: string): string {
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('255')) return `+${trimmed}`;
  if (trimmed.startsWith('0')) return `+255${trimmed.slice(1)}`;
  return `+${trimmed}`;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function imageExceedsWhatsAppLimit(imageUrl: string): Promise<boolean> {
  try {
    const head = await fetch(imageUrl, { method: 'HEAD' });
    const headerLength = Number(head.headers.get('content-length'));
    if (Number.isFinite(headerLength) && headerLength > 0) {
      return headerLength > WHATSAPP_IMAGE_MAX_BYTES;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) return true;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > WHATSAPP_IMAGE_MAX_BYTES;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = request.nextUrl.searchParams.get('event_id');
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      );
    }

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const remaining = await getPendingCounts(eventId);
    return NextResponse.json({ success: true, data: { remaining } });
  } catch (error) {
    console.error('GET /api/guests/send-batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending counts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = body.event_id as string | undefined;
    const guestType = body.guest_type as GuestType | undefined;
    const batchSize = Math.min(
      Math.max(Number(body.batch_size) || DEFAULT_BATCH_SIZE, 1),
      25
    );

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      );
    }

    if (guestType !== 'single' && guestType !== 'double') {
      return NextResponse.json(
        { success: false, error: 'guest_type must be single or double' },
        { status: 400 }
      );
    }

    const event = await getOwnedEvent(userId, eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const cardImageUrl = await getEventCardImageUrl(eventId);
    if (!cardImageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'No card image found for this event. Upload a card design first.',
        },
        { status: 400 }
      );
    }

    const templateName = resolveWhatsAppTemplate(event.type);
    if (templateName === null || !isTemplateApproved(templateName)) {
      return NextResponse.json(
        { success: false, error: TEMPLATE_NOT_USABLE_REASON },
        { status: 400 }
      );
    }

    const guests = await getGuestsToSend(eventId, guestType, batchSize, 0);
    const formattedDateTime = formatSwahiliDateTime(event.date, event.time);
    const venue = event.venue ?? '';
    const locationLink = event.location_link ?? '';
    const smsTemplate = buildSmsInvitationBody(
      event.name,
      formattedDateTime,
      venue,
      locationLink
    );
    const invitationSubject =
      templateName === 'nivle_event_invitation'
        ? event.family_name?.trim() || event.name
        : event.family_name?.trim() || '';

    let imageBlocked: boolean | null = null;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      const guestTypeValue = guest.guest_type ?? 'single';
      const phone = formatPhoneForSending(guest.phone);
      const whatsappEligible = guestHasWhatsApp(guest.has_whatsapp);

      let smsOk = false;
      let smsExternalId: string | undefined;
      let smsFailureReason = SMS_SEND_FAILED_REASON;
      let whatsappOk = false;
      let whatsappExternalId: string | undefined;
      let whatsappFailureReason = WHATSAPP_SEND_FAILED_REASON;

      try {
        const smsResult = await sendSMS(phone, smsTemplate, {
          guestName: guest.name,
          guestType: guestTypeValue,
          allowLong: true,
        });
        smsOk = smsResult.success;
        if (smsOk) {
          smsExternalId = smsResult.externalId;
        } else if (smsResult.error === SMS_TOO_LONG_REASON) {
          smsFailureReason = SMS_TOO_LONG_REASON;
        }
      } catch {
        console.error('SMS send error');
      }

      if (whatsappEligible) {
        if (imageBlocked === null) {
          imageBlocked = await imageExceedsWhatsAppLimit(cardImageUrl);
        }
        if (imageBlocked) {
          whatsappFailureReason = CARD_TOO_LARGE_REASON;
        } else {
          try {
            const waResponse = await sendWhatsAppInvitation(phone, {
              guestName: guest.name,
              guestType: guestTypeValue,
              eventName: event.name,
              familyName: invitationSubject,
              dateTime: formattedDateTime,
              venue: venue || 'TBA',
              locationLink,
              headerImageUrl: cardImageUrl,
              templateName,
              templateLanguage: whatsAppTemplateLanguage(templateName),
            });
            const externalId = waResponse?.messages?.[0]?.id;
            if (typeof externalId === 'string' && externalId) {
              whatsappOk = true;
              whatsappExternalId = externalId;
            }
          } catch {
            console.error('WhatsApp invitation error');
          }
        }
      }

      const smsContent = smsOk
        ? personalizeGuestMessage(smsTemplate, guest.name, guestTypeValue)
        : smsFailureReason;
      await insertOutboundMessage(
        guest.id,
        eventId,
        'SMS',
        smsContent,
        smsOk,
        smsOk ? smsExternalId : undefined
      );

      if (whatsappEligible) {
        const whatsappContent = whatsappOk
          ? `Mwaliko wa ${event.name} — ${formattedDateTime}`
          : whatsappFailureReason;
        await insertOutboundMessage(
          guest.id,
          eventId,
          'WhatsApp',
          whatsappContent,
          whatsappOk,
          whatsappOk ? whatsappExternalId : undefined
        );
      }

      const overallSuccess = smsOk && (!whatsappEligible || whatsappOk);
      await markGuestSent(guest.id, overallSuccess);

      if (overallSuccess) {
        succeeded++;
      } else {
        failed++;
      }

      if (i < guests.length - 1) {
        await delay(GUEST_DELAY_MS);
      }
    }

    const remaining = await getPendingCounts(eventId);

    return NextResponse.json({
      success: true,
      data: {
        processed: guests.length,
        succeeded,
        failed,
        remaining,
      },
    });
  } catch (error) {
    console.error('POST /api/guests/send-batch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation batch' },
      { status: 500 }
    );
  }
}
