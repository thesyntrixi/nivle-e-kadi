'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { StaffEventScanner } from '@/components/checkin/StaffEventScanner';

type EventInfo = {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
};

function formatEventHeader(date: string, time: string | null): string {
  const d = new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
  return time ? `${d} · ${time}` : d;
}

export default function StaffEventCheckinPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/staff/check-in/${eventId}/stats`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEvent(d.data.event);
        } else {
          setError(d.error || 'Failed to load event');
        }
      })
      .catch(() => setError('Failed to load event'))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return <p className="text-neutral-muted">Loading...</p>;
  }

  if (error || !event) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <Alert variant="error" message={error || 'Event not found'} />
        <Link href="/check-in-staff" className="text-primary hover:underline text-small">
          ← Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/check-in-staff"
          className="text-neutral-muted hover:text-neutral-text transition-colors"
          aria-label="Back"
        >
          ◀
        </Link>
        <div>
          <h2 className="text-h2 text-neutral-text">
            Event: {event.name} — {formatEventHeader(event.date, event.time)}
          </h2>
          {event.venue && (
            <p className="text-small text-neutral-muted">{event.venue}</p>
          )}
        </div>
      </div>

      <StaffEventScanner eventId={eventId} />
    </div>
  );
}
