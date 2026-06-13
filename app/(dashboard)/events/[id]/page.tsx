'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Client, Event } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EventForm, EventFormData } from '@/components/forms/EventForm';
import { EventWithClient } from '@/components/dashboard/EventsTable';

interface EditEventPageProps {
  params: { id: string };
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<EventWithClient | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    try {
      const response = await fetch(`/api/events/${params.id}`);
      const data = await response.json();

      if (!data.success) {
        setFetchError(data.error || 'Failed to load event. Please try again.');
        return;
      }

      setEvent(data.data);
    } catch (err) {
      console.error('Fetch event error:', err);
      setFetchError('Failed to load event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvent();
    fetchClients();
  }, [fetchEvent, fetchClients]);

  async function handleSubmit(data: EventFormData) {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: data.client_id,
          name: data.name.trim(),
          type: data.type,
          date: data.date,
          time: data.time || undefined,
          venue: data.venue.trim() || undefined,
          location_link: data.location_link.trim() || undefined,
          status: data.status,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to update event. Please try again.');
        return;
      }

      router.push('/events');
    } catch (err) {
      console.error('Update event error:', err);
      setError('Failed to update event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to delete event. Please try again.');
        return;
      }

      router.push('/events');
    } catch (err) {
      console.error('Delete event error:', err);
      setError('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-16 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="border-neutral-border border-t-primary" />
          <p className="text-small text-neutral-muted">Loading event...</p>
        </div>
      </Card>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Alert
          variant="error"
          title="Event not found"
          message={fetchError || 'The event you are looking for does not exist.'}
        />
        <Button variant="outline" onClick={fetchEvent}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-h1 text-neutral-text">Edit Event</h2>
        <p className="text-neutral-muted mt-1">
          Update details for {event.name}
        </p>
        {event.guest_count > 0 && (
          <p className="text-small text-neutral-muted mt-2">
            <span className="text-neutral-text font-medium">{event.guest_count}</span> guest
            {event.guest_count === 1 ? '' : 's'} registered
          </p>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Something went wrong" message={error} />
      )}

      <Card padding="lg">
        <EventForm
          initialData={event as Event}
          clients={clients}
          onSubmit={handleSubmit}
          isLoading={submitting}
          clientsLoading={clientsLoading}
        />
      </Card>

      <Card padding="md" className="border-accent-error/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-h3 text-accent-error">Danger Zone</h3>
            <p className="text-small text-neutral-muted mt-1">
              Permanently remove this event and all associated guests
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            disabled={submitting}
            className="shrink-0"
          >
            {deleting ? 'Deleting...' : 'Delete Event'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
