'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  getShukraniSmsPreview,
  getShukraniWhatsAppPreview,
} from '@/lib/services/shukrani';

type ShukraniChannel = 'sms' | 'whatsapp';

interface TumaShukraniButtonProps {
  eventId: string;
  eventName: string;
  compact?: boolean;
}

type Phase = 'idle' | 'modal' | 'sending' | 'done' | 'error';

type SendStats = {
  smsSent: number;
  smsFailed: number;
  whatsappSent: number;
  whatsappFailed: number;
  total: number;
};

async function fetchGuestTotal(eventId: string): Promise<number> {
  const res = await fetch(`/api/guests/send-shukrani?event_id=${eventId}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch guest count');
  }
  return data.data.total as number;
}

async function sendShukraniBatch(
  eventId: string,
  channel: ShukraniChannel,
  offset: number
) {
  const res = await fetch('/api/guests/send-shukrani', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      channel,
      batch_size: 10,
      offset,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Batch send failed');
  }
  return data.data as {
    processed: number;
    sms_sent: number;
    sms_failed: number;
    whatsapp_sent: number;
    whatsapp_failed: number;
    remaining: number;
    total: number;
  };
}

export function TumaShukraniButton({
  eventId,
  eventName,
  compact = false,
}: TumaShukraniButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [channel, setChannel] = useState<ShukraniChannel>('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [stats, setStats] = useState<SendStats>({
    smsSent: 0,
    smsFailed: 0,
    whatsappSent: 0,
    whatsappFailed: 0,
    total: 0,
  });

  const smsPreview = useMemo(() => getShukraniSmsPreview(eventName), [eventName]);
  const whatsappPreview = useMemo(
    () => getShukraniWhatsAppPreview(eventName),
    [eventName]
  );

  function reset() {
    setPhase('idle');
    setError('');
    setProgressCurrent(0);
    setProgressTotal(0);
    setStats({
      smsSent: 0,
      smsFailed: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      total: 0,
    });
  }

  async function handleSend() {
    setLoading(true);
    setError('');
    setPhase('sending');

    try {
      const total = await fetchGuestTotal(eventId);
      if (total === 0) {
        setError('Hakuna wageni kwa tukio hili.');
        setPhase('error');
        return;
      }

      setProgressTotal(total);
      setProgressCurrent(0);

      let offset = 0;
      let smsSent = 0;
      let smsFailed = 0;
      let whatsappSent = 0;
      let whatsappFailed = 0;

      while (true) {
        const result = await sendShukraniBatch(eventId, channel, offset);
        smsSent += result.sms_sent;
        smsFailed += result.sms_failed;
        whatsappSent += result.whatsapp_sent;
        whatsappFailed += result.whatsapp_failed;
        offset += result.processed;
        setProgressCurrent(offset);

        if (result.remaining === 0 || result.processed === 0) {
          break;
        }
      }

      setStats({
        smsSent,
        smsFailed,
        whatsappSent,
        whatsappFailed,
        total,
      });
      setPhase('done');
    } catch (err) {
      console.error('Tuma Shukrani error:', err);
      setError(err instanceof Error ? err.message : 'Imeshindwa kutuma shukrani');
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setPhase('modal')}
        disabled={phase === 'sending'}
        className={
          compact ? '!px-2.5 !py-1.5 text-small whitespace-nowrap shrink-0' : undefined
        }
      >
        Tuma Shukrani
      </Button>

      {phase === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card padding="lg" className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-5">
            <div>
              <h3 className="text-h2 text-neutral-text">Tuma Shukrani</h3>
              <p className="text-small text-neutral-muted mt-1">
                Tuma ujumbe wa shukrani na uuzaji kwa wageni wote wa tukio hili.
              </p>
            </div>

            <div>
              <p className="text-small font-medium uppercase tracking-wide text-neutral-muted mb-1">
                Tukio
              </p>
              <p className="text-sm font-semibold text-neutral-text">{eventName}</p>
            </div>

            <div className="space-y-3">
              <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
                Njia ya kutuma
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`shukrani-channel-${eventId}`}
                  checked={channel === 'sms'}
                  onChange={() => setChannel('sms')}
                  className="accent-primary"
                />
                <span className="text-sm text-neutral-text">SMS</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`shukrani-channel-${eventId}`}
                  checked={channel === 'whatsapp'}
                  onChange={() => setChannel('whatsapp')}
                  className="accent-primary"
                />
                <span className="text-sm text-neutral-text">WhatsApp</span>
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
                Hakiki ujumbe
              </p>
              {channel === 'sms' && (
                <div className="rounded-input bg-surface-hover p-3 space-y-2">
                  <p className="text-small font-medium text-neutral-text">SMS (Single):</p>
                  <p className="text-small text-neutral-muted whitespace-pre-wrap">
                    {smsPreview.single}
                  </p>
                  <p className="text-small font-medium text-neutral-text pt-2">SMS (Double):</p>
                  <p className="text-small text-neutral-muted whitespace-pre-wrap">
                    {smsPreview.double}
                  </p>
                </div>
              )}
              {channel === 'whatsapp' && (
                <div className="rounded-input bg-surface-hover p-3">
                  <p className="text-small font-medium text-neutral-text mb-2">WhatsApp:</p>
                  <p className="text-small text-neutral-muted whitespace-pre-wrap">
                    {whatsappPreview}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSend} loading={loading}>
                Tuma
              </Button>
              <Button variant="outline" onClick={reset} disabled={loading}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {phase === 'sending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card padding="lg" className="w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <p className="text-sm font-medium text-neutral-text">Inatuma...</p>
            </div>
            <p className="text-sm text-neutral-muted">
              {progressCurrent} / {progressTotal}
            </p>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width:
                    progressTotal > 0
                      ? `${Math.min(100, (progressCurrent / progressTotal) * 100)}%`
                      : '0%',
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {phase === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card padding="lg" className="w-full max-w-md space-y-4">
            <Alert variant="error" message={error} />
            <div className="flex gap-3">
              <Button onClick={() => setPhase('modal')}>Jaribu Tena</Button>
              <Button variant="outline" onClick={reset}>
                Funga
              </Button>
            </div>
          </Card>
        </div>
      )}

      {phase === 'done' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card
            padding="lg"
            className="w-full max-w-md space-y-4 border border-accent-success/30 bg-accent-success/5"
          >
            <p className="text-sm font-semibold text-accent-success">Imekamilika!</p>
            {channel === 'sms' && (
              <p className="text-sm text-neutral-text">
                SMS: {stats.smsSent}/{stats.total} zimetumwa
                {stats.smsFailed > 0 && ` (${stats.smsFailed} zilishindwa)`}
              </p>
            )}
            {channel === 'whatsapp' && (
              <p className="text-sm text-neutral-text">
                WhatsApp: {stats.whatsappSent}/{stats.total} zimetumwa
                {stats.whatsappFailed > 0 && ` (${stats.whatsappFailed} zilishindwa)`}
              </p>
            )}
            <Button variant="outline" onClick={reset}>
              Funga
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
