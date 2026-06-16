'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EventForm, EventFormData } from '@/components/forms/EventForm';

export default function NewEventPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      } else {
        setError(data.error || 'Failed to load clients. Please try again.');
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleSubmit(data: EventFormData) {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: data.client_id,
          name: data.name.trim(),
          family_name: data.family_name.trim() || undefined,
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
        setError(result.error || 'Failed to create event. Please try again.');
        return;
      }

      router.push('/events');
    } catch (err) {
      console.error('Create event error:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (clientsLoading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-16 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="border-neutral-border border-t-primary" />
          <p className="text-small text-neutral-muted">Loading clients...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-h1 text-neutral-text">Create New Event</h2>
        <p className="text-neutral-muted mt-1">
          Set up a new event and link it to a client
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Could not create event" message={error} />
      )}

      <Card padding="lg">
        <EventForm
          clients={clients}
          onSubmit={handleSubmit}
          isLoading={submitting}
          clientsLoading={clientsLoading}
        />
      </Card>
    </div>
  );
}
