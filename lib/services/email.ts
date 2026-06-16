// lib/services/email.ts
// Resend email integration

import { Resend } from 'resend';

const REPORT_RECIPIENT = 'nivle.ekadi@gmail.com';
const DEFAULT_FROM_EMAIL = 'NIVLE E-Kadi <kelvin@nivle-ekadi.com>';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 60) || 'event';
}

export async function sendCheckinReport(
  eventName: string,
  pdfBuffer: Buffer
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service is not configured (RESEND_API_KEY missing)' };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
  const safeName = sanitizeFilename(eventName);
  const filename = `checkin-report-${safeName}.pdf`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: REPORT_RECIPIENT,
      subject: `Ripoti ya Check-in - ${eventName}`,
      text: 'Tafadhali angalia ripoti ya check-in iliyoambatishwa.',
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    console.error('sendCheckinReport error:', message);
    return { success: false, error: message };
  }
}
