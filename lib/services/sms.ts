// lib/services/sms.ts
// Real NextSms SMS integration

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

/**
 * Send SMS via NextSms API
 * @param phone - Recipient phone number (e.g., +255712345678)
 * @param message - SMS message text
 * @returns Success status and external ID (for tracking)
 */
export async function sendSMS(
  phone: string,
  message: string
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

    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return {
        success: false,
        error: 'Invalid phone format. Use +255... format',
      };
    }

    const body = JSON.stringify({
      to: normalizedPhone,
      message: message.substring(0, 160),
    });

    const response = await fetch(NEXTSMS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success !== false) {
      const id = data.messageId || data.id || '';
      return {
        success: true,
        externalId: id,
        messageId: id,
      };
    }

    const errorMessage =
      data.message || data.error || 'SMS service unavailable';
    console.error(`NextSms API error: ${errorMessage}`);

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
