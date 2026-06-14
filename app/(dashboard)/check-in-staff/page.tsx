'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AssignedEvent } from '@/lib/database/types';

function formatEventDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function staffDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CheckInStaffPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/staff/events').then((r) => r.json()),
    ])
      .then(([meData, eventsData]) => {
        if (meData.success) {
          setEmail(meData.data.email);
          setRole(meData.data.role);
          if (meData.data.role === 'admin') {
            router.replace('/');
            return;
          }
        }

        if (eventsData.success) {
          setEvents(eventsData.data);
        } else {
          setError(eventsData.error || 'Failed to load events');
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <p className="text-neutral-muted">Loading...</p>;
  }

  if (role === 'admin') {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h1 text-neutral-text">
            Welcome {staffDisplayName(email)}
          </h2>
          <p className="text-neutral-muted mt-1 text-small">{email}</p>
        </div>
      </div>

      <div>
        <h3 className="text-h2 text-neutral-text uppercase tracking-wide">
          Chagua Sherehe ya Kucheck-In
        </h3>
        <p className="text-neutral-muted mt-1 text-small">
          Chagua sherehe uliyopewa kufanya check-in
        </p>
      </div>

      {error && <Alert variant="error" message={error} />}

      {events.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-neutral-muted">
            Hakuna sherehe zilizokupangiwa. Wasiliana na admin.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} padding="md" className="space-y-4 hover:border-primary/40 transition-colors">
              <div>
                <h4 className="text-lg font-semibold text-neutral-text">{event.name}</h4>
                <p className="text-small text-neutral-muted mt-1">
                  {formatEventDate(event.date)}
                  {event.time ? ` · ${event.time}` : ''}
                </p>
                {event.venue && (
                  <p className="text-small text-neutral-muted mt-1">{event.venue}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-small">
                <span className="text-neutral-muted">Wageni</span>
                <span className="font-semibold text-neutral-text">
                  {event.checked_in_count ?? 0} / {event.total_guests ?? 0}
                </span>
              </div>

              <Link href={`/check-in-staff/${event.id}`}>
                <Button fullWidth>Check In Guests</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
