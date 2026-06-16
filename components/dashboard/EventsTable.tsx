'use client';

import Link from 'next/link';
import { Event } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TumaShukraniButton } from '@/components/events/TumaShukraniButton';

export type EventWithClient = Event & { client_name: string };

interface EventsTableProps {
  events: EventWithClient[];
  onDelete: (id: string) => Promise<void>;
  deletingId?: string | null;
}

function formatEventDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: Event['status'] }) {
  const styles: Record<Event['status'], string> = {
    Draft: 'bg-neutral-muted/20 text-neutral-muted border-neutral-border',
    Active: 'bg-accent-success/20 text-accent-success border-accent-success/40',
    Completed: 'bg-accent-info/20 text-accent-info border-accent-info/40',
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-small font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function EventsTable({ events, onDelete, deletingId = null }: EventsTableProps) {
  if (events.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <div className="py-8">
          <span className="text-4xl mb-4 block" aria-hidden="true">
            📅
          </span>
          <h3 className="text-h3 text-neutral-text mb-2">No events yet</h3>
          <p className="text-neutral-muted text-small mb-6">
            Create your first event to start managing invitations and guest lists.
          </p>
          <Link href="/events/new">
            <Button>Create Your First Event</Button>
          </Link>
        </div>
      </Card>
    );
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    await onDelete(id);
  }

  return (
    <>
      <Card padding="sm" className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-border">
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Type
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Date
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Client
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Venue
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-neutral-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="px-4 py-4 text-sm font-medium text-neutral-text">
                    {event.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">{event.type}</td>
                  <td className="px-4 py-4 text-sm text-neutral-muted whitespace-nowrap">
                    {formatEventDate(event.date)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <Link
                      href={`/clients/${event.client_id}`}
                      className="text-primary hover:underline"
                    >
                      {event.client_name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted max-w-[160px] truncate">
                    {event.venue ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                      <TumaShukraniButton
                        eventId={event.id}
                        eventName={event.name}
                        compact
                      />
                      <Link href={`/events/${event.id}`} className="shrink-0">
                        <Button variant="outline" className="!px-4 !py-2 text-small whitespace-nowrap">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        className="!px-4 !py-2 text-small whitespace-nowrap shrink-0"
                        loading={deletingId === event.id}
                        onClick={() => handleDelete(event.id, event.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="lg:hidden space-y-4">
        {events.map((event) => (
          <Card key={event.id} padding="md">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-h3 text-neutral-text">{event.name}</h3>
                  <p className="text-small text-neutral-muted mt-1">{event.type}</p>
                </div>
                <StatusBadge status={event.status} />
              </div>

              <div className="space-y-1 text-small">
                <p className="text-neutral-muted">
                  <span className="text-neutral-text font-medium">Date: </span>
                  {formatEventDate(event.date)}
                  {event.time && ` at ${formatTimeForInput(event.time)}`}
                </p>
                <p className="text-neutral-muted">
                  <span className="text-neutral-text font-medium">Client: </span>
                  <Link href={`/clients/${event.client_id}`} className="text-primary hover:underline">
                    {event.client_name}
                  </Link>
                </p>
                {event.venue && (
                  <p className="text-neutral-muted">
                    <span className="text-neutral-text font-medium">Venue: </span>
                    {event.venue}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <TumaShukraniButton eventId={event.id} eventName={event.name} compact />
                <Link href={`/events/${event.id}`} className="flex-1 min-w-[100px]">
                  <Button variant="outline" fullWidth className="!py-2 text-small">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  fullWidth
                  className="!py-2 text-small flex-1"
                  loading={deletingId === event.id}
                  onClick={() => handleDelete(event.id, event.name)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function formatTimeForInput(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

export function EventsTableLoading() {
  return (
    <Card padding="lg" className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="border-neutral-border border-t-primary" />
        <p className="text-small text-neutral-muted">Loading events...</p>
      </div>
    </Card>
  );
}
