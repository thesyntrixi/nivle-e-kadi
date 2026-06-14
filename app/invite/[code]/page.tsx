import QRCode from 'qrcode';
import { query } from '@/lib/db';
import { Card } from '@/components/ui/Card';

interface InvitePageProps {
  params: { code: string };
}

function formatEventDateTime(date: Date | string, time: string | null): string {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return time ? `${dateStr} · ${time}` : dateStr;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const result = await query(
    `SELECT g.id, g.name, g.invitation_code,
            e.name AS event_name, e.date, e.time, e.venue
     FROM guests g
     JOIN events e ON g.event_id = e.id
     WHERE g.invitation_code = $1`,
    [params.code]
  );

  if (result.rows.length === 0) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-6">
        <Card padding="lg" className="max-w-md w-full text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🎫</span>
          <h1 className="text-h2 text-neutral-text mb-2">Invitation not found</h1>
          <p className="text-neutral-muted text-small">
            This invitation code is invalid or has expired. Please contact the event organizer.
          </p>
        </Card>
      </div>
    );
  }

  const guest = result.rows[0];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nivle-app-v3.vercel.app';
  const inviteUrl = `${baseUrl}/invite/${guest.invitation_code}`;

  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 320,
    margin: 2,
  });

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-6">
      <Card padding="lg" className="max-w-md w-full text-center space-y-6">
        <div>
          <p className="text-small text-primary font-medium uppercase tracking-wide mb-2">
            NIVLE E-Kadi
          </p>
          <h1 className="text-h1 text-neutral-text">Karibu, {guest.name}!</h1>
        </div>

        <div className="space-y-2 text-left">
          <p className="text-h3 text-neutral-text">{guest.event_name}</p>
          <p className="text-small text-neutral-muted">
            {formatEventDateTime(guest.date, guest.time)}
          </p>
          {guest.venue && (
            <p className="text-small text-neutral-muted">📍 {guest.venue}</p>
          )}
        </div>

        <div className="flex justify-center">
          <img
            src={qrDataUrl}
            alt="Your invitation QR code"
            width={320}
            height={320}
            className="rounded-card border border-neutral-border bg-white p-2"
          />
        </div>

        <p className="text-small text-neutral-muted">
          Onyesha QR hii kwenye mlango wa tukio
        </p>
        <p className="text-xs text-neutral-muted font-mono">{guest.invitation_code}</p>
      </Card>
    </div>
  );
}
