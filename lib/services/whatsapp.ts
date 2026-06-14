// lib/services/whatsapp.ts
// Meta WhatsApp Cloud API integration

const WHATSAPP_API_VERSION = 'v21.0';

export type SendWhatsAppResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

function getApiUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function isConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Format phone number for WhatsApp API (digits only, no + or spaces)
 */
function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[\s+]/g, '');
}

/**
 * Send a plain text WhatsApp message (used by Messages feature).
 * Note: Free-form text only works within the 24-hour customer service window.
 */
export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<SendWhatsAppResult> {
  if (!isConfigured()) {
    return { success: false, error: 'WhatsApp service is not configured' };
  }

  try {
    const formattedPhone = formatPhoneForWhatsApp(phone);

    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: { body: message.substring(0, 4096) },
    };

    console.log('WhatsApp text request payload:', JSON.stringify(requestBody));

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    console.log('WhatsApp text response:', JSON.stringify(responseData));

    if (!response.ok) {
      console.error('WhatsApp API error:', JSON.stringify(responseData));
      const errMsg =
        responseData?.error?.message ||
        JSON.stringify(responseData) ||
        'WhatsApp service unavailable';
      return { success: false, error: errMsg };
    }

    const externalId = responseData?.messages?.[0]?.id || String(Date.now());
    return { success: true, externalId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('WhatsApp send failed:', errorMsg);
    return { success: false, error: 'WhatsApp service unavailable' };
  }
}

/**
 * Send the default "hello_world" template (pre-approved by Meta, English).
 * Used for testing the connection.
 */
export async function sendWhatsAppHelloWorld(to: string) {
  const formattedPhone = formatPhoneForWhatsApp(to);

  const requestBody = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' },
    },
  };

  console.log('WhatsApp request payload:', JSON.stringify(requestBody));

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();
  console.log('WhatsApp response:', JSON.stringify(responseData));

  if (!response.ok) {
    console.error('WhatsApp API error:', JSON.stringify(responseData));
    throw new Error(`WhatsApp API error: ${JSON.stringify(responseData)}`);
  }

  return responseData;
}

/**
 * Send the "nivle_event_invitation" template (Swahili, Marketing category).
 * Template structure:
 * - Header: IMAGE
 * - Body variables (in order): {{1}} guest_name, {{2}} event_name,
 *   {{3}} date_time, {{4}} venue, {{5}} location_link
 * - Buttons: Quick Reply "Nitakuwepo ✅" and "Sitakuwepo ❌" (index 0 and 1)
 *
 * NOTE: This template must be APPROVED by Meta before this function will work.
 */
export async function sendWhatsAppInvitation(
  to: string,
  params: {
    guestName: string;
    eventName: string;
    dateTime: string;
    venue: string;
    locationLink: string;
    headerImageUrl: string;
  }
) {
  const formattedPhone = formatPhoneForWhatsApp(to);

  const requestBody = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'nivle_event_invitation',
      language: { code: 'sw' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { link: params.headerImageUrl },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.guestName },
            { type: 'text', text: params.eventName },
            { type: 'text', text: params.dateTime },
            { type: 'text', text: params.venue },
            { type: 'text', text: params.locationLink },
          ],
        },
      ],
    },
  };

  console.log('WhatsApp invitation request payload:', JSON.stringify(requestBody));

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json();
  console.log('WhatsApp invitation response:', JSON.stringify(responseData));

  if (!response.ok) {
    console.error('WhatsApp API error:', JSON.stringify(responseData));
    throw new Error(`WhatsApp API error: ${JSON.stringify(responseData)}`);
  }

  return responseData;
}
