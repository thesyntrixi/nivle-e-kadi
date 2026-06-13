'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { CardItem } from '@/components/dashboard/CardsGrid';

interface CardDetailPageProps {
  params: { id: string };
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const router = useRouter();
  const [card, setCard] = useState<CardItem | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchCard = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    try {
      const response = await fetch(`/api/cards/${params.id}`);
      const data = await response.json();

      if (!data.success) {
        setFetchError(data.error || 'Failed to load card. Please try again.');
        return;
      }

      setCard(data.data);
      setSelectedEventId(data.data.event_id);
    } catch (err) {
      console.error('Fetch card error:', err);
      setFetchError('Failed to load card. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('Fetch events error:', err);
    }
  }, []);

  useEffect(() => {
    fetchCard();
    fetchEvents();
  }, [fetchCard, fetchEvents]);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this card? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/cards/${params.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to delete card. Please try again.');
        return;
      }

      router.push('/cards');
    } catch (err) {
      console.error('Delete card error:', err);
      setError('Failed to delete card. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleLinkEvent() {
    if (!selectedEventId) {
      setError('Please select an event to link this card');
      return;
    }

    setLinking(true);
    setError('');

    try {
      const response = await fetch(`/api/cards/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEventId }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to update card. Please try again.');
        return;
      }

      setCard(result.data);
      setShowLinkModal(false);
    } catch (err) {
      console.error('Link event error:', err);
      setError('Failed to update card. Please try again.');
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-16 max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="border-neutral-border border-t-primary" />
          <p className="text-small text-neutral-muted">Loading card...</p>
        </div>
      </Card>
    );
  }

  if (fetchError || !card) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Alert
          variant="error"
          title="Card not found"
          message={fetchError || 'The card you are looking for does not exist.'}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchCard}>
            Try Again
          </Button>
          <Link href="/cards">
            <Button variant="ghost">Back to Cards</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isImage = card.file_type !== 'PDF';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/cards"
            className="text-small text-primary hover:underline mb-2 inline-block"
          >
            ← Back to Cards
          </Link>
          <h2 className="text-h1 text-neutral-text">{card.original_file_name}</h2>
          <p className="text-neutral-muted mt-1">
            {card.event_name ? `Linked to ${card.event_name}` : 'Card template'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={card.file_url} download={card.original_file_name}>
            <Button variant="outline" className="!py-2 text-small">
              Download
            </Button>
          </a>
          <Button
            variant="outline"
            className="!py-2 text-small"
            onClick={() => setShowLinkModal(true)}
          >
            Change Event
          </Button>
          <Button
            variant="danger"
            className="!py-2 text-small"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Something went wrong" message={error} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          {isImage ? (
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              className="w-full rounded-input overflow-hidden border border-neutral-border hover:border-primary/50 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.file_url}
                alt={card.original_file_name}
                className="w-full max-h-[400px] object-contain bg-surface-hover"
              />
            </button>
          ) : (
            <div className="aspect-[4/3] bg-surface-hover flex flex-col items-center justify-center rounded-input border border-neutral-border">
              <span className="text-6xl mb-4" aria-hidden="true">📄</span>
              <p className="text-neutral-text font-medium">PDF Document</p>
              <a
                href={card.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-small mt-2 hover:underline"
              >
                Open PDF in new tab
              </a>
            </div>
          )}
          {isImage && (
            <p className="text-small text-neutral-muted text-center mt-3">
              Click image for full view
            </p>
          )}
        </Card>

        <Card padding="lg" className="space-y-4">
          <h3 className="text-h3 text-neutral-text">Card Details</h3>

          <dl className="space-y-3 text-small">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-muted">File Name</dt>
              <dd className="text-neutral-text font-medium text-right truncate">
                {card.original_file_name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-muted">File Type</dt>
              <dd className="text-neutral-text font-medium">{card.file_type}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-muted">File Size</dt>
              <dd className="text-neutral-text font-medium">
                {formatFileSize(card.file_size)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-muted">Uploaded</dt>
              <dd className="text-neutral-text font-medium text-right">
                {formatDate(card.created_at)}
              </dd>
            </div>
            {card.width && card.height && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-muted">Dimensions</dt>
                <dd className="text-neutral-text font-medium">
                  {card.width} × {card.height}px
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-muted">Linked Event</dt>
              <dd className="text-neutral-text font-medium text-right">
                {card.event_name ?? '—'}
              </dd>
            </div>
            {card.guest_count !== undefined && card.guest_count > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-muted">Guests</dt>
                <dd className="text-neutral-text font-medium">
                  {card.guest_count} registered
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {showLightbox && isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full size card preview"
        >
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close lightbox"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.file_url}
            alt={card.original_file_name}
            className="max-w-full max-h-[90vh] object-contain rounded-card"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Link card to event"
        >
          <Card padding="lg" className="w-full max-w-md animate-slide-up">
            <h3 className="text-h3 text-neutral-text mb-4">Link to Event</h3>
            <p className="text-small text-neutral-muted mb-4">
              Select an event to associate with this card template.
            </p>

            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="input-field appearance-none cursor-pointer w-full mb-4"
              disabled={linking}
            >
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowLinkModal(false)}
                disabled={linking}
              >
                Cancel
              </Button>
              <Button fullWidth loading={linking} onClick={handleLinkEvent}>
                {linking ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
