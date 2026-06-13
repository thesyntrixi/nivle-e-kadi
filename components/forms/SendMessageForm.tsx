'use client';

import { useEffect, useState } from 'react';
import { Guest } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export type SendMessageData = {
  type: 'SMS' | 'WhatsApp';
  recipientIds: string[];
  message: string;
  eventId: string;
};

interface SendMessageFormProps {
  onSubmit: (data: SendMessageData) => Promise<void>;
  isLoading?: boolean;
  defaultType?: 'SMS' | 'WhatsApp';
}

const SMS_LIMIT = 160;
const WHATSAPP_LIMIT = 4096;

export function SendMessageForm({
  onSubmit,
  isLoading = false,
  defaultType = 'SMS',
}: SendMessageFormProps) {
  const [type, setType] = useState<'SMS' | 'WhatsApp'>(defaultType);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventId, setEventId] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingGuests, setLoadingGuests] = useState(false);

  const charLimit = type === 'SMS' ? SMS_LIMIT : WHATSAPP_LIMIT;
  const charCount = message.length;
  const smsSegments = type === 'SMS' ? Math.ceil(charCount / SMS_LIMIT) || 1 : 1;

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEvents(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!eventId) {
      setGuests([]);
      setSelectedGuests([]);
      return;
    }

    setLoadingGuests(true);
    fetch(`/api/guests?event_id=${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGuests(d.data);
      })
      .catch(console.error)
      .finally(() => setLoadingGuests(false));
  }, [eventId]);

  function toggleGuest(id: string) {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function selectAllGuests() {
    setSelectedGuests(guests.map((g) => g.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!eventId) {
      setError('Please select an event');
      return;
    }
    if (selectedGuests.length === 0) {
      setError('Select at least one recipient');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }
    if (message.length > charLimit) {
      setError(`Message exceeds ${charLimit} character limit`);
      return;
    }

    try {
      await onSubmit({
        type,
        recipientIds: selectedGuests,
        message: message.trim(),
        eventId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error" message={error} />}

      <div className="space-y-2">
        <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
          Message Type
        </p>
        <div className="flex gap-4">
          {(['SMS', 'WhatsApp'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="message-type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                disabled={isLoading}
                className="text-primary"
              />
              <span className="text-sm text-neutral-text">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="event-select"
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          Event
        </label>
        <select
          id="event-select"
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setSelectedGuests([]);
          }}
          disabled={isLoading}
          className="input-field appearance-none cursor-pointer w-full"
        >
          <option value="">Select an event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {eventId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
              Recipients ({selectedGuests.length} selected)
            </p>
            <button
              type="button"
              onClick={selectAllGuests}
              className="text-small text-primary hover:underline"
            >
              Select all
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-neutral-border rounded-input p-3 space-y-2">
            {loadingGuests ? (
              <p className="text-small text-neutral-muted">Loading guests...</p>
            ) : guests.length === 0 ? (
              <p className="text-small text-neutral-muted">No guests for this event</p>
            ) : (
              guests.map((guest) => (
                <label
                  key={guest.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => toggleGuest(guest.id)}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-neutral-text">{guest.name}</span>
                  <span className="text-small text-neutral-muted">{guest.phone}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="message-text"
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          Message
        </label>
        <textarea
          id="message-text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          disabled={isLoading}
          placeholder="Type your invitation message..."
          className="input-field resize-none"
        />
        <div className="flex justify-between text-small">
          <span
            className={
              charCount > charLimit ? 'text-accent-error' : 'text-neutral-muted'
            }
          >
            {charCount} / {charLimit} characters
            {type === 'SMS' && charCount > 0 && ` (${smsSegments} SMS segment${smsSegments > 1 ? 's' : ''})`}
          </span>
          {type === 'SMS' && charCount > SMS_LIMIT && (
            <span className="text-accent-warning">Will split into multiple SMS</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" fullWidth loading={isLoading}>
          {isLoading ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}
