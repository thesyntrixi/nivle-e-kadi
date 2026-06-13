'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Client } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import {
  EventsTable,
  EventsTableLoading,
  EventWithClient,
} from '@/components/dashboard/EventsTable';
import { EVENT_STATUSES } from '@/components/forms/EventForm';

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filterClient) params.set('client_id', filterClient);
      if (filterStatus) params.set('status', filterStatus);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/events${query}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load events. Please try again.');
        return;
      }

      setEvents(data.data);
    } catch (err) {
      console.error('Fetch events error:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterStatus]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (err) {
      console.error('Fetch clients for filter error:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete event. Please try again.');
        return;
      }

      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      console.error('Delete event error:', err);
      setError('Failed to delete event. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  const hasFilters = filterClient || filterStatus;

  const filteredCountLabel = useMemo(() => {
    if (!hasFilters) return null;
    return `${events.length} event${events.length === 1 ? '' : 's'} found`;
  }, [events.length, hasFilters]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h1 text-neutral-text">Events</h2>
          <p className="text-neutral-muted mt-1">
            Manage events, venues, and invitation campaigns
          </p>
        </div>
        <Link href="/events/new">
          <Button className="w-full sm:w-auto">+ New Event</Button>
        </Link>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="filter-client"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Filter by Client
            </label>
            <select
              id="filter-client"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="input-field appearance-none cursor-pointer w-full"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label
              htmlFor="filter-status"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field appearance-none cursor-pointer w-full"
            >
              <option value="">All statuses</option>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterClient('');
                  setFilterStatus('');
                }}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        {filteredCountLabel && (
          <p className="text-small text-neutral-muted mt-3">{filteredCountLabel}</p>
        )}
      </Card>

      {error && (
        <Alert variant="error" title="Something went wrong" message={error} />
      )}

      {error && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={fetchEvents}>
            Try Again
          </Button>
        </div>
      )}

      {loading ? (
        <EventsTableLoading />
      ) : events.length === 0 && hasFilters ? (
        <Card padding="lg" className="text-center py-8">
          <p className="text-neutral-muted mb-4">No events match your filters.</p>
          <Button
            variant="outline"
            onClick={() => {
              setFilterClient('');
              setFilterStatus('');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <EventsTable
          events={events}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}
