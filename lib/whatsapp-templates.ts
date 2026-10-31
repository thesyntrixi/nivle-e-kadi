const GENERAL_TEMPLATE = 'nivle_general_invitation';

const ALWAYS_APPROVED = new Set(['nivle_event_invitation', 'nivle_sendoff_invitation']);

export function resolveWhatsAppTemplate(eventType: string | null | undefined): string | null {
  const key = eventType?.trim().toLowerCase() ?? '';
  if (!key) return null;
  if (key === 'wedding') return 'nivle_event_invitation';
  if (key === 'sendoff') return 'nivle_sendoff_invitation';
  if (key === 'ticket') return 'nivle_ticket_invitation';
  if (
    key === 'birthday' ||
    key === 'graduation' ||
    key === 'kitchen party' ||
    key === 'meeting' ||
    key === 'conference' ||
    key === 'corporate' ||
    key === 'other'
  ) {
    return GENERAL_TEMPLATE;
  }
  return null;
}

export function isTemplateApproved(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (ALWAYS_APPROVED.has(trimmed)) return true;

  const raw = process.env.WHATSAPP_APPROVED_TEMPLATES ?? '';
  if (!raw.trim()) return false;

  return raw.split(',').some((item) => item.trim() === trimmed);
}

export function templateBlockedReason(templateName: string | null): string {
  if (!templateName) {
    return 'Template bado haijakubaliwa na Meta. Tumia SMS tu.';
  }
  return `Template ${templateName} bado haijakubaliwa na Meta. Tumia SMS tu.`;
}
