'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export type SendMessageData = {
  message: string;
  eventId: string;
};

interface SendMessageFormProps {
  onSubmit: (data: SendMessageData) => Promise<void>;
  isLoading?: boolean;
}

const SMS_LIMIT = 160;

export function SendMessageForm({
  onSubmit,
  isLoading = false,
}: SendMessageFormProps) {
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / SMS_LIMIT) || 1;

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEvents(d.data);
      })
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!eventId) {
      setError('Please select an event');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }
    if (message.length > SMS_LIMIT) {
      setError(`Message exceeds ${SMS_LIMIT} character limit`);
      return;
    }

    try {
      await onSubmit({
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
        <label
          htmlFor="event-select"
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          Event
        </label>
        <select
          id="event-select"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
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
          placeholder="Type your message..."
          className="input-field resize-none"
        />
        <div className="flex justify-between text-small">
          <span
            className={
              charCount > SMS_LIMIT ? 'text-accent-error' : 'text-neutral-muted'
            }
          >
            {charCount} / {SMS_LIMIT} characters
            {charCount > 0 && ` (${smsSegments} SMS segment${smsSegments > 1 ? 's' : ''})`}
          </span>
          {charCount > SMS_LIMIT && (
            <span className="text-accent-warning">Exceeds SMS limit</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" fullWidth loading={isLoading}>
          {isLoading ? 'Inatuma...' : 'Tuma Message'}
        </Button>
      </div>
    </form>
  );
}
