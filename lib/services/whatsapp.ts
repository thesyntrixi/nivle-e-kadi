// lib/services/whatsapp.ts
// Africa's Talking WhatsApp / messaging integration

const AT_API_URL =
  process.env.AFRICAS_TALKING_ENV === 'production'
    ? 'https://api.africastalking.com/version1/messaging'
    : 'https://api.sandbox.africastalking.com/version1/messaging';

export type SendWhatsAppResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^\+/, '');
  if (cleaned.startsWith('0')) {
    return `+255${cleaned.slice(1)}`;
  }
  if (!cleaned.startsWith('255')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<SendWhatsAppResult> {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME;

  if (!apiKey || !username) {
    return { success: false, error: 'WhatsApp service is not configured' };
  }

  if (apiKey === 'test' || username === 'test') {
    return {
      success: true,
      externalId: `test-wa-${Date.now()}`,
    };
  }

  try {
    const formattedPhone = formatPhone(phone);
    const body = new URLSearchParams({
      username,
      to: formattedPhone,
      message,
    });

    const response = await fetch(AT_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: apiKey,
      },
      body: body.toString(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error:
          data?.SMSMessageData?.Message ||
          data?.errorMessage ||
          'WhatsApp service unavailable',
      };
    }

    const recipients = data?.SMSMessageData?.Recipients;
    const first = Array.isArray(recipients) ? recipients[0] : null;

    if (first?.status === 'Failed' || first?.statusCode > 400) {
      return {
        success: false,
        error: first?.status || 'Message delivery failed',
      };
    }

    return {
      success: true,
      externalId:
        first?.messageId ||
        first?.message_id ||
        data?.SMSMessageData?.Message?.replace(/\D/g, '') ||
        String(Date.now()),
    };
  } catch (error) {
    console.error('Africa\'s Talking error:', error);
    return { success: false, error: 'WhatsApp service unavailable' };
  }
}
