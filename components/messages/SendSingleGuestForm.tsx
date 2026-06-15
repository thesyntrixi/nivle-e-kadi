'use client';

import { useEffect, useMemo, useState } from 'react';
import { Guest } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface SendSingleGuestFormProps {
  onSent?: () => void;
}

export function SendSingleGuestForm({ onSent }: SendSingleGuestFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventId, setEventId] = useState('');
  const [guestId, setGuestId] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    sms_sent: boolean;
    whatsapp_sent: boolean;
    guest_status?: string;
    error?: string;
  } | null>(null);

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
      setGuestId('');
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

  useEffect(() => {
    if (!cardFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(cardFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cardFile]);

  const filteredGuests = useMemo(() => {
    if (!guestSearch.trim()) return guests;
    const q = guestSearch.toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.invitation_code.toLowerCase().includes(q)
    );
  }, [guests, guestSearch]);

  const selectedGuest = guests.find((g) => g.id === guestId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCardFile(file);
    setResult(null);
    setError('');
  }

  async function handleSend() {
    setError('');
    setResult(null);

    if (!eventId) {
      setError('Chagua tukio kwanza');
      return;
    }
    if (!guestId) {
      setError('Chagua mgeni');
      return;
    }
    if (!cardFile) {
      setError('Pakia kadi ya mwaliko (PNG/JPG)');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('guest_id', guestId);
      formData.append('file', cardFile);

      const response = await fetch('/api/guests/send-single', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setResult({
        success: data.success,
        sms_sent: data.sms_sent ?? false,
        whatsapp_sent: data.whatsapp_sent ?? false,
        guest_status: data.guest_status,
        error: data.error,
      });

      if (!data.success) {
        setError(data.error || 'Imeshindwa kutuma mwaliko');
        return;
      }

      onSent?.();
    } catch {
      setError('Imeshindwa kutuma mwaliko. Jaribu tena.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="md" className="border border-primary/20">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-h3 text-neutral-text">Tuma kwa Mtu Mmoja</h3>
          <p className="text-small text-neutral-muted mt-1">
            Pakia kadi maalum na tuma SMS + WhatsApp kwa mgeni mmoja
          </p>
        </div>
        <span className="text-neutral-muted text-lg ml-4">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-4 border-t border-neutral-border pt-6">
          <div className="space-y-2">
            <label
              htmlFor="single-send-event"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Tukio
            </label>
            <select
              id="single-send-event"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setGuestId('');
                setResult(null);
              }}
              className="input-field appearance-none cursor-pointer w-full"
              disabled={sending}
            >
              <option value="">Chagua tukio...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {eventId && (
            <>
              <Input
                label="Tafuta Mgeni"
                type="search"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Jina, simu, au code..."
                disabled={sending || loadingGuests}
              />

              <div className="space-y-2">
                <label
                  htmlFor="single-send-guest"
                  className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
                >
                  Mgeni
                </label>
                <select
                  id="single-send-guest"
                  value={guestId}
                  onChange={(e) => {
                    setGuestId(e.target.value);
                    setResult(null);
                  }}
                  className="input-field appearance-none cursor-pointer w-full"
                  disabled={sending || loadingGuests}
                >
                  <option value="">
                    {loadingGuests ? 'Inapakia wageni...' : 'Chagua mgeni...'}
                  </option>
                  {filteredGuests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.phone} ({g.guest_type ?? 'single'}) [{g.status}]
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-small font-medium uppercase tracking-wide text-neutral-muted">
              Kadi ya Mwaliko (PNG/JPG)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              disabled={sending}
              className="block w-full text-small text-neutral-muted file:mr-3 file:py-2 file:px-4 file:rounded-input file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90 disabled:opacity-50"
            />
          </div>

          {previewUrl && (
            <div className="space-y-2">
              <p className="text-small text-neutral-muted">Onyesho la kadi:</p>
              <img
                src={previewUrl}
                alt="Card preview"
                className="max-h-48 rounded-card border border-neutral-border object-contain bg-white"
              />
            </div>
          )}

          {selectedGuest && (
            <p className="text-small text-neutral-muted">
              Status sasa: <span className="text-neutral-text font-medium">{selectedGuest.status}</span>
            </p>
          )}

          {error && <Alert variant="error" message={error} />}

          {result && (
            <Alert
              variant={result.success ? 'success' : 'warning'}
              message={
                result.success
                  ? `Imetumwa! SMS: ${result.sms_sent ? '✓' : '✗'}, WhatsApp: ${result.whatsapp_sent ? '✓' : '✗'}. Status: ${result.guest_status}`
                  : result.error || 'Imeshindwa kutuma'
              }
            />
          )}

          <Button
            onClick={handleSend}
            loading={sending}
            disabled={!eventId || !guestId || !cardFile}
            fullWidth
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                Inatuma...
              </span>
            ) : (
              'Tuma'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
