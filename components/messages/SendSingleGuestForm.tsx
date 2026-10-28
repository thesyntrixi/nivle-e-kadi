'use client';

import { useEffect, useMemo, useState } from 'react';
import { Guest, GuestType } from '@/lib/database/types';
import { getGuestTypeBadgeLabel, guestTypeBadgeClass } from '@/lib/guest-type';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const DEFAULT_CUSTOM_MESSAGE =
  'Habari [JINA]! Tafadhali pokea mwaliko wako. Fika na ujumbe huu - utakaguliwa mlangoni. NIVLE E-Kadi';

type SendChannel = 'whatsapp' | 'sms' | 'both';

type GuestSendResult = {
  guest_id: string;
  guest_name: string;
  success: boolean;
  sms_sent: boolean;
  whatsapp_sent: boolean;
  guest_status?: string;
  error?: string;
};

interface SendSingleGuestFormProps {
  onSent?: () => void;
}

function GuestTypeBadge({ guestType }: { guestType?: GuestType }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${guestTypeBadgeClass(guestType)}`}
    >
      {getGuestTypeBadgeLabel(guestType)}
    </span>
  );
}

function WhatsAppBadge({ hasWhatsapp }: { hasWhatsapp?: boolean }) {
  const enabled = hasWhatsapp !== false;
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
        enabled
          ? 'bg-accent-success/20 text-accent-success border-accent-success/40'
          : 'bg-neutral-muted/20 text-neutral-muted border-neutral-border'
      }`}
    >
      {enabled ? 'WhatsApp' : 'SMS tu'}
    </span>
  );
}

export function SendSingleGuestForm({ onSent }: SendSingleGuestFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [clientId, setClientId] = useState('');
  const [eventId, setEventId] = useState('');
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [customMessage, setCustomMessage] = useState(DEFAULT_CUSTOM_MESSAGE);
  const [channel, setChannel] = useState<SendChannel>('both');
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<GuestSendResult[]>([]);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClients(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setEventId('');
    setEvents([]);
    setGuests([]);
    setSelectedGuestIds([]);
    if (!clientId) return;

    setLoadingEvents(true);
    fetch(`/api/events?client_id=${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEvents(d.data);
      })
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, [clientId]);

  useEffect(() => {
    setGuests([]);
    setSelectedGuestIds([]);
    if (!eventId) return;

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

  const allFilteredSelected =
    filteredGuests.length > 0 &&
    filteredGuests.every((g) => selectedGuestIds.includes(g.id));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCardFile(file);
    setResults([]);
    setError('');
  }

  function toggleGuest(guestId: string) {
    setSelectedGuestIds((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : [...prev, guestId]
    );
    setResults([]);
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredGuests.map((g) => g.id));
      setSelectedGuestIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const merged = new Set(selectedGuestIds);
      filteredGuests.forEach((g) => merged.add(g.id));
      setSelectedGuestIds(Array.from(merged));
    }
    setResults([]);
  }

  async function handleSend() {
    setError('');
    setResults([]);
    setProgress('');

    if (!clientId) {
      setError('Chagua mteja kwanza');
      return;
    }
    if (!eventId) {
      setError('Chagua tukio kwanza');
      return;
    }
    if (selectedGuestIds.length === 0) {
      setError('Chagua angalau mgeni mmoja');
      return;
    }
    if (!customMessage.trim()) {
      setError('Andika ujumbe');
      return;
    }
    if (channel !== 'sms' && !cardFile) {
      setError('Pakia kadi ya mwaliko (PNG/JPG)');
      return;
    }

    const selectedGuests = guests.filter((g) => selectedGuestIds.includes(g.id));
    setSending(true);

    const collected: GuestSendResult[] = [];
    let sharedCardUrl: string | undefined;
    let anySuccess = false;

    try {
      for (let i = 0; i < selectedGuests.length; i++) {
        const guest = selectedGuests[i];
        setProgress(`Inatuma kwa ${guest.name}... (${i + 1}/${selectedGuests.length})`);

        let data: {
          success?: boolean;
          sms_sent?: boolean;
          whatsapp_sent?: boolean;
          guest_status?: string;
          card_image_url?: string;
          error?: string;
        };

        if (!sharedCardUrl && cardFile) {
          const formData = new FormData();
          formData.append('guest_id', guest.id);
          formData.append('file', cardFile);
          formData.append('custom_message', customMessage.trim());
          formData.append('channel', channel);

          const response = await fetch('/api/guests/send-single', {
            method: 'POST',
            body: formData,
          });
          data = await response.json();
          if (data.card_image_url) {
            sharedCardUrl = data.card_image_url;
          }
        } else {
          const response = await fetch('/api/guests/send-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guest_id: guest.id,
              custom_message: customMessage.trim(),
              card_image_url: sharedCardUrl,
              channel,
            }),
          });
          data = await response.json();
          if (!sharedCardUrl && data.card_image_url) {
            sharedCardUrl = data.card_image_url;
          }
        }

        const guestResult: GuestSendResult = {
          guest_id: guest.id,
          guest_name: guest.name,
          success: Boolean(data.success),
          sms_sent: Boolean(data.sms_sent),
          whatsapp_sent: Boolean(data.whatsapp_sent),
          guest_status: data.guest_status,
          error: data.error,
        };
        collected.push(guestResult);
        setResults([...collected]);

        if (data.success) {
          anySuccess = true;
          if (data.guest_status) {
            setGuests((prev) =>
              prev.map((g) =>
                g.id === guest.id ? { ...g, status: data.guest_status as Guest['status'] } : g
              )
            );
          }
        }
      }

      if (anySuccess) {
        onSent?.();
      }
      if (!anySuccess) {
        setError(collected[0]?.error || 'Imeshindwa kutuma mwaliko');
      }
    } catch {
      setError('Imeshindwa kutuma mwaliko. Jaribu tena.');
    } finally {
      setSending(false);
      setProgress('');
    }
  }

  const succeededCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const cardRequired = channel !== 'sms';

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
            Chagua wageni, andika ujumbe, pakia kadi, kisha tuma WhatsApp, SMS, au zote mbili
          </p>
        </div>
        <span className="text-neutral-muted text-lg ml-4">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-4 border-t border-neutral-border pt-6">
          <div className="space-y-2">
            <label
              htmlFor="single-send-client"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Mteja
            </label>
            <select
              id="single-send-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setResults([]);
              }}
              className="input-field appearance-none cursor-pointer w-full"
              disabled={sending}
            >
              <option value="">Chagua mteja...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {clientId && (
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
                  setResults([]);
                }}
                className="input-field appearance-none cursor-pointer w-full"
                disabled={sending || loadingEvents}
              >
                <option value="">
                  {loadingEvents ? 'Inapakia matukio...' : 'Chagua tukio...'}
                </option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <div className="flex items-center justify-between">
                  <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
                    Wageni ({selectedGuestIds.length} wamechaguliwa)
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      disabled={sending || loadingGuests || filteredGuests.length === 0}
                      className="h-4 w-4 rounded border-neutral-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-neutral-text">Chagua Wote</span>
                  </label>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-card border border-neutral-border divide-y divide-neutral-border">
                  {loadingGuests ? (
                    <p className="px-3 py-4 text-small text-neutral-muted">Inapakia wageni...</p>
                  ) : filteredGuests.length === 0 ? (
                    <p className="px-3 py-4 text-small text-neutral-muted">Hakuna wageni.</p>
                  ) : (
                    filteredGuests.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-surface-hover/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGuestIds.includes(g.id)}
                          onChange={() => toggleGuest(g.id)}
                          disabled={sending}
                          className="mt-1 h-4 w-4 rounded border-neutral-border text-primary focus:ring-primary"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-neutral-text">{g.name}</p>
                          <p className="text-small text-neutral-muted">{g.phone}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <GuestTypeBadge guestType={g.guest_type} />
                            <WhatsAppBadge hasWhatsapp={g.has_whatsapp} />
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label
              htmlFor="single-send-message"
              className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
            >
              Ujumbe
            </label>
            <textarea
              id="single-send-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Habari [JINA]! ..."
              disabled={sending}
              rows={4}
              className="input-field w-full min-h-[6rem] resize-y"
            />
            <p className="text-small text-neutral-muted">
              [JINA] itabadilishwa na jina la kila mgeni automatically
            </p>
          </div>

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

          <div className="space-y-2">
            <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
              Njia ya kutuma
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="single-send-channel"
                  value="whatsapp"
                  checked={channel === 'whatsapp'}
                  onChange={() => setChannel('whatsapp')}
                  disabled={sending}
                  className="text-primary"
                />
                <span className="text-sm text-neutral-text">WhatsApp tu</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="single-send-channel"
                  value="sms"
                  checked={channel === 'sms'}
                  onChange={() => setChannel('sms')}
                  disabled={sending}
                  className="text-primary"
                />
                <span className="text-sm text-neutral-text">SMS tu</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="single-send-channel"
                  value="both"
                  checked={channel === 'both'}
                  onChange={() => setChannel('both')}
                  disabled={sending}
                  className="text-primary"
                />
                <span className="text-sm text-neutral-text">Zote mbili</span>
              </label>
            </div>
          </div>

          {error && <Alert variant="error" message={error} />}

          {progress && (
            <p className="text-small text-neutral-text inline-flex items-center gap-2">
              <Spinner size="sm" />
              {progress}
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2 rounded-card border border-neutral-border p-3">
              <p className="text-sm font-medium text-neutral-text">
                Muhtasari: {succeededCount} wametumwa, {failedCount} wameshindwa
              </p>
              <ul className="space-y-1">
                {results.map((r) => (
                  <li key={r.guest_id} className="text-small text-neutral-muted">
                    {r.success ? '✅' : '❌'} {r.guest_name} — SMS: {r.sms_sent ? '✅' : '❌'},
                    WhatsApp: {r.whatsapp_sent ? '✅' : '❌'}
                    {!r.success && r.error ? ` (${r.error})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={handleSend}
            loading={sending}
            disabled={
              !eventId ||
              selectedGuestIds.length === 0 ||
              !customMessage.trim() ||
              (cardRequired && !cardFile)
            }
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
