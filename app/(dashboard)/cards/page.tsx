'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Event } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { CardsGrid, CardsGridLoading, CardItem } from '@/components/dashboard/CardsGrid';
import { CardUploadForm } from '@/components/forms/CardUploadForm';

export default function CardsPage() {
  return (
    <Suspense fallback={<CardsGridLoading />}>
      <CardsPageContent />
    </Suspense>
  );
}

function CardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showUpload = searchParams.get('view') === 'upload';

  const [cards, setCards] = useState<CardItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterEvent, setFilterEvent] = useState('');

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = filterEvent ? `?event_id=${filterEvent}` : '';
      const response = await fetch(`/api/cards${params}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load cards. Please try again.');
        return;
      }

      setCards(data.data);
    } catch (err) {
      console.error('Fetch cards error:', err);
      setError('Failed to load cards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterEvent]);

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

  useEffect(() => {
    if (!showUpload) {
      fetchCards();
    }
    fetchEvents();
  }, [fetchCards, fetchEvents, showUpload]);

  async function handleUpload(file: File, eventId?: string) {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (eventId) formData.append('event_id', eventId);

      const response = await fetch('/api/cards/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'File upload failed. Please try again.');
      }

      router.push('/cards');
    } catch (err) {
      console.error('Upload card error:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete card. Please try again.');
        return;
      }

      setCards((prev) => prev.filter((card) => card.id !== id));
    } catch (err) {
      console.error('Delete card error:', err);
      setError('Failed to delete card. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  if (showUpload) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h2 className="text-h1 text-neutral-text">Upload Invitation Card</h2>
          <p className="text-neutral-muted mt-1">
            Upload a PNG, JPG, or PDF template for your event invitations
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Upload error" message={error} />
        )}

        <Card padding="lg">
          <CardUploadForm
            onSubmit={handleUpload}
            isLoading={uploading}
            events={events}
            eventsLoading={eventsLoading}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h1 text-neutral-text">Cards</h2>
          <p className="text-neutral-muted mt-1">
            Manage invitation card templates for your events
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push('/cards?view=upload')}
        >
          + Upload New Card
        </Button>
      </div>

      {events.length > 0 && (
        <Card padding="md">
          <div className="space-y-2">
            <label
              htmlFor="filter-event"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Filter by Event
            </label>
            <select
              id="filter-event"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="input-field appearance-none cursor-pointer w-full sm:max-w-xs"
            >
              <option value="">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {error && (
        <Alert variant="error" title="Something went wrong" message={error} />
      )}

      {error && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={fetchCards}>
            Try Again
          </Button>
        </div>
      )}

      {loading ? (
        <CardsGridLoading />
      ) : cards.length === 0 && filterEvent ? (
        <Card padding="lg" className="text-center py-8">
          <p className="text-neutral-muted mb-4">No cards found for this event.</p>
          <Button variant="outline" onClick={() => setFilterEvent('')}>
            Clear Filter
          </Button>
        </Card>
      ) : (
        <CardsGrid
          cards={cards}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      {cards.length === 0 && !loading && !filterEvent && (
        <div className="flex justify-center">
          <Button onClick={() => router.push('/cards?view=upload')}>
            Upload Your First Card
          </Button>
        </div>
      )}
    </div>
  );
}
