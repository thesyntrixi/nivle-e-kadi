'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Event } from '@/lib/database/types';
import { Guest } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { GuestsTable, GuestsTableLoading } from '@/components/dashboard/GuestsTable';

export default function GuestsPage() {
  return (
    <Suspense fallback={<GuestsTableLoading />}>
      <GuestsPageContent />
    </Suspense>
  );
}

function GuestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEventId = searchParams.get('event_id') ?? '';

  const [events, setEvents] = useState<Event[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('Fetch events error:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchGuests = useCallback(async () => {
    if (!selectedEventId) {
      setGuests([]);
      return;
    }

    setGuestsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/guests?event_id=${selectedEventId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load guests. Please try again.');
        return;
      }

      setGuests(data.data);
    } catch (err) {
      console.error('Fetch guests error:', err);
      setError('Failed to load guests. Please try again.');
    } finally {
      setGuestsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  function handleEventChange(eventId: string) {
    if (eventId) {
      router.push(`/guests?event_id=${eventId}`);
    } else {
      router.push('/guests');
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete guest. Please try again.');
        return;
      }

      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Delete guest error:', err);
      setError('Failed to delete guest. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h1 text-neutral-text">Guests</h2>
          <p className="text-neutral-muted mt-1">
            Manage guest lists and invitation codes per event
          </p>
        </div>
        {selectedEventId && (
          <Link href={`/guests/${selectedEventId}`}>
            <Button className="w-full sm:w-auto">+ Upload Guest List</Button>
          </Link>
        )}
      </div>

      <Card padding="md">
        <div className="space-y-2">
          <label
            htmlFor="event-select"
            className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
          >
            Select Event
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
            disabled={eventsLoading}
            className="input-field appearance-none cursor-pointer w-full sm:max-w-md"
          >
            <option value="">
              {eventsLoading ? 'Loading events...' : 'Choose an event'}
            </option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!selectedEventId && !eventsLoading && (
        <Card padding="lg" className="text-center py-12">
          <span className="text-4xl mb-4 block" aria-hidden="true">📅</span>
          <h3 className="text-h3 text-neutral-text mb-2">Select an event</h3>
          <p className="text-neutral-muted text-small">
            Choose an event above to view and manage its guest list.
          </p>
        </Card>
      )}

      {selectedEventId && (
        <>
          {selectedEvent && (
            <p className="text-small text-neutral-muted">
              Showing guests for <span className="text-neutral-text font-medium">{selectedEvent.name}</span>
              {' '}({guests.length} total)
            </p>
          )}

          <Input
            label="Search Guests"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, or code..."
          />

          {error && (
            <Alert variant="error" title="Something went wrong" message={error} />
          )}

          {error && !guestsLoading && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={fetchGuests}>
                Try Again
              </Button>
            </div>
          )}

          {guestsLoading ? (
            <GuestsTableLoading />
          ) : (
            <GuestsTable
              guests={guests}
              eventId={selectedEventId}
              onDelete={handleDelete}
              onRefresh={fetchGuests}
              deletingId={deletingId}
              searchQuery={searchQuery}
            />
          )}

          {guests.length === 0 && !guestsLoading && (
            <div className="flex justify-center">
              <Link href={`/guests/${selectedEventId}`}>
                <Button>Import Guest List</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
