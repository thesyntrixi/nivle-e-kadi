// lib/services/sms.ts
// Real NextSms SMS integration

import { GuestType } from '@/lib/database/types';

const NEXTSMS_API_URL = 'https://messaging-service.co.tz/api/sms/v1/text/single';

const NEXTSMS_USERNAME = process.env.NEXTSMS_USERNAME || '';
const NEXTSMS_PASSWORD = process.env.NEXTSMS_PASSWORD || '';

/**
 * Create Basic Auth header for NextSms API
 * Format: Base64(username:password)
 */
function createAuthHeader(): string {
  const credentials = `${NEXTSMS_USERNAME}:${NEXTSMS_PASSWORD}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

function formatPhoneForNextSms(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^\+/, '');
}

/**
 * Format guest name with Single/Double status label (name used as-is from admin).
 */
export function formatGuestDisplayName(
  guestName: string,
  guestType: GuestType = 'single'
): string {
  if (guestType === 'double') {
    return `${guestName} (Double - watu 2)`;
  }
  return `${guestName} (Single)`;
}

function applyDoublePluralForms(message: string): string {
  return message
    .replace(/Umekaribishwa/g, 'Mmekaribishwa')
    .replace(/umekaribishwa/g, 'mmekaribishwa')
    .replace(/Tunakukaribisha/g, 'Tunawakaribisha')
    .replace(/tunakukaribisha/g, 'tunawakaribisha')
    .replace(/tungependa uwepo/gi, 'tungependa muwepo')
    .replace(/Tungependa uwepo/g, 'Tungependa muwepo')
    .replace(/\bUwepo\b/g, 'Muwepo')
    .replace(/\buwepo\b/g, 'muwepo')
    .replace(/\bWewe\b/g, 'Ninyi')
    .replace(/\bwewe\b/g, 'ninyi');
}

/**
 * Personalize invitation message text based on guest type.
 * Name is used exactly as entered; Single/Double label appended after name.
 */
export function personalizeGuestMessage(
  message: string,
  guestName: string,
  guestType: GuestType = 'single'
): string {
  const labeledName = formatGuestDisplayName(guestName, guestType);
  let result = message.replace(/\{name\}/gi, labeledName);

  if (guestType === 'double') {
    result = applyDoublePluralForms(result);
  }

  return result;
}

/**
 * Send SMS via NextSms API
 * @param phone - Recipient phone number (e.g., +255712345678)
 * @param message - SMS message text
 * @returns Success status and external ID (for tracking)
 */
export async function sendSMS(
  phone: string,
  message: string,
  options?: { guestName?: string; guestType?: GuestType }
): Promise<{
  success: boolean;
  externalId?: string;
  error?: string;
  messageId?: string;
}> {
  try {
    if (!phone || !message) {
      return {
        success: false,
        error: 'Phone number and message are required',
      };
    }

    if (!NEXTSMS_USERNAME || !NEXTSMS_PASSWORD) {
      return {
        success: false,
        error: 'SMS service is not configured',
      };
    }

    const normalizedPhone = phone.replace(/\s+/g, '');
    const phoneWithPlus = normalizedPhone.startsWith('+')
      ? normalizedPhone
      : `+${normalizedPhone}`;

    if (!/^\+\d{10,15}$/.test(phoneWithPlus)) {
      return {
        success: false,
        error: 'Invalid phone format. Use +255... format',
      };
    }

    const formattedPhone = formatPhoneForNextSms(normalizedPhone);
    const reference = `nivle-${Date.now()}`;
    const textMessage =
      options?.guestName !== undefined
        ? personalizeGuestMessage(message, options.guestName, options.guestType ?? 'single')
        : message;

    const requestBody = {
      from: 'NivleDesign',
      to: formattedPhone,
      text: textMessage.substring(0, 160),
      reference,
    };

    console.log('NextSms request payload:', JSON.stringify(requestBody));

    const response = await fetch(NEXTSMS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    console.log('NextSms response:', JSON.stringify(data));

    if (response.ok && data.success !== false) {
      const id = data.messageId || data.id || reference;
      return {
        success: true,
        externalId: id,
        messageId: id,
      };
    }

    console.error('NextSms API error:', JSON.stringify(data));

    const errorMessage =
      data.message || data.error || JSON.stringify(data) || 'SMS service unavailable';

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`SMS sending failed: ${errorMsg}`);

    return {
      success: false,
      error: `Failed to send SMS: ${errorMsg}`,
    };
  }
}

/**
 * Check SMS balance
 */
export async function checkSMSBalance(): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    if (!NEXTSMS_USERNAME || !NEXTSMS_PASSWORD) {
      return {
        success: false,
        error: 'SMS service is not configured',
      };
    }

    const response = await fetch(
      'https://messaging-service.co.tz/api/sms/v1/balance',
      {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        success: true,
        balance: data.sms_balance || 0,
      };
    }

    return {
      success: false,
      error: data.message || 'Failed to fetch balance',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to check balance: ${errorMsg}`,
    };
  }
}

/**
 * Verify SMS credentials (test connection)
 */
export async function verifySMSCredentials(): Promise<boolean> {
  if (!NEXTSMS_USERNAME || !NEXTSMS_PASSWORD) {
    console.error('NextSms credentials not configured in .env.local');
    return false;
  }

  try {
    const result = await checkSMSBalance();
    return result.success;
  } catch (error) {
    console.error('Failed to verify SMS credentials:', error);
    return false;
  }
}
