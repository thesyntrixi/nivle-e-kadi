'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Guest, GuestType } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface SendSingleGuestFormProps {
  onSent?: () => void;
}

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function GuestTypeBadge({ guestType }: { guestType?: GuestType }) {
  const isDouble = guestType === 'double';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
        isDouble
          ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      }`}
    >
      {isDouble ? 'Double' : 'Single'}
    </span>
  );
}

function StatusBadge({ status }: { status: Guest['status'] }) {
  const styles: Record<Guest['status'], string> = {
    Pending: 'bg-accent-warning/20 text-accent-warning border-accent-warning/40',
    Sent: 'bg-accent-success/20 text-accent-success border-accent-success/40',
    Delivered: 'bg-accent-success/15 text-accent-success border-accent-success/30',
    Opened: 'bg-accent-info/20 text-accent-info border-accent-info/40',
    Failed: 'bg-accent-error/20 text-accent-error border-accent-error/40',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function isValidImageFile(file: File): boolean {
  return ALLOWED_TYPES.has(file.type);
}

export function SendSingleGuestForm({ onSent }: SendSingleGuestFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventId, setEventId] = useState('');
  const [guestId, setGuestId] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
    setCardFile(null);
    setResult(null);
    setError('');
  }, [guestId]);

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
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, guestSearch]);

  const selectedGuest = guests.find((g) => g.id === guestId);

  function selectCardFile(file: File | null) {
    if (!file) return;
    if (!isValidImageFile(file)) {
      setError('Pakia PNG au JPG tu');
      return;
    }
    setCardFile(file);
    setResult(null);
    setError('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    selectCardFile(e.target.files?.[0] ?? null);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    selectCardFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleSelectGuest(id: string) {
    setGuestId(id);
  }

  async function handleSend() {
    setError('');
    setResult(null);

    if (!guestId || !cardFile) return;

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

      if (data.guest_status) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId ? { ...g, status: data.guest_status } : g
          )
        );
      }

      onSent?.();
    } catch {
      setError('Imeshindwa kutuma mwaliko. Jaribu tena.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="sm" className="border border-neutral-border overflow-hidden !p-0">
      <div className="px-4 sm:px-5 py-4 border-b border-neutral-border bg-surface-card">
        <h3 className="text-h3 text-neutral-text">Tuma kwa Mtu Mmoja</h3>
        <p className="text-small text-neutral-muted mt-1">
          Chagua mgeni, pakia kadi maalum, kisha tuma SMS + WhatsApp
        </p>
      </div>

      <div className="flex flex-col md:flex-row min-h-[520px] max-h-[70vh] md:max-h-[560px]">
        {/* Left panel — guest list */}
        <div className="w-full md:w-[35%] flex flex-col min-h-[280px] md:min-h-0 border-b md:border-b-0 md:border-r border-neutral-border bg-surface-page">
          <div className="p-4 space-y-3 border-b border-neutral-border shrink-0">
            <label htmlFor="single-send-event" className="sr-only">
              Tukio
            </label>
            <select
              id="single-send-event"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setGuestId('');
                setGuestSearch('');
                setResult(null);
                setError('');
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

            {eventId && (
              <input
                type="search"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Tafuta kwa jina..."
                disabled={sending || loadingGuests}
                className="input-field w-full"
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {!eventId ? (
              <p className="text-small text-neutral-muted text-center py-12 px-4">
                Chagua tukio kuona orodha ya wageni
              </p>
            ) : loadingGuests ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="md" className="border-neutral-border border-t-primary" />
              </div>
            ) : filteredGuests.length === 0 ? (
              <p className="text-small text-neutral-muted text-center py-12 px-4">
                Hakuna wageni waliopatikana
              </p>
            ) : (
              <ul className="divide-y divide-neutral-border">
                {filteredGuests.map((guest) => {
                  const isActive = guest.id === guestId;
                  return (
                    <li key={guest.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectGuest(guest.id)}
                        disabled={sending}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isActive
                            ? 'bg-primary/15 border-l-2 border-l-primary'
                            : 'hover:bg-surface-hover border-l-2 border-l-transparent'
                        }`}
                      >
                        <p className="font-semibold text-neutral-text truncate">
                          {guest.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <GuestTypeBadge guestType={guest.guest_type} />
                          <StatusBadge status={guest.status} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel — card upload & send */}
        <div className="flex-1 flex flex-col min-h-[320px] md:min-h-0 bg-surface-card">
          {!selectedGuest ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-page border border-neutral-border flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-neutral-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-neutral-muted text-small">
                  Chagua mgeni kushoto kuanza
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
              <div className="shrink-0 mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-xl font-semibold text-neutral-text">
                    {selectedGuest.name}
                  </h4>
                  <GuestTypeBadge guestType={selectedGuest.guest_type} />
                </div>
                <p className="text-small text-neutral-muted">{selectedGuest.phone}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                disabled={sending}
                className="sr-only"
              />

              <div className="flex-1 flex flex-col min-h-0">
                {!previewUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    disabled={sending}
                    className={`flex-1 min-h-[300px] rounded-card border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                      dragOver
                        ? 'border-primary bg-primary/10'
                        : 'border-neutral-border bg-surface-page hover:border-primary/50 hover:bg-surface-hover'
                    } disabled:opacity-50`}
                  >
                    <svg
                      className="w-12 h-12 text-neutral-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-neutral-text font-medium">
                      Pakia Card ya Mgeni Huyu
                    </span>
                    <span className="text-small text-neutral-muted">
                      Buruta &amp; acha au bofya — PNG/JPG
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-[300px] rounded-card border border-neutral-border bg-surface-page overflow-hidden flex items-center justify-center p-4">
                      <img
                        src={previewUrl}
                        alt={`Kadi ya ${selectedGuest.name}`}
                        className="max-h-[min(420px,50vh)] w-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      className="mt-3 self-center"
                    >
                      Badilisha Card
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 text-small text-accent-error" role="alert">
                  {error}
                </p>
              )}

              {result && (
                <div className="mt-4" role="status">
                  {result.success ? (
                    <p className="text-small font-medium text-accent-success">
                      SMS {result.sms_sent ? '✅' : '❌'} WhatsApp{' '}
                      {result.whatsapp_sent ? '✅' : '❌'}
                    </p>
                  ) : (
                    <p className="text-small font-medium text-accent-error">
                      SMS {result.sms_sent ? '✅' : '❌'} WhatsApp{' '}
                      {result.whatsapp_sent ? '✅' : '❌'}
                      {result.error ? ` — ${result.error}` : ''}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleSend}
                loading={sending}
                disabled={!cardFile || sending}
                fullWidth
                className="mt-6 shrink-0"
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
        </div>
      </div>
    </Card>
  );
}
