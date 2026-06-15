'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';

interface SendInvitationsButtonProps {
  eventId: string;
}

type PendingCounts = { single: number; double: number };

type Phase = 'idle' | 'confirm' | 'double' | 'single' | 'done' | 'error';

type PhaseStats = {
  sent: number;
  failed: number;
  total: number;
};

async function fetchPendingCounts(eventId: string): Promise<PendingCounts> {
  const res = await fetch(`/api/guests/send-batch?event_id=${eventId}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch pending counts');
  }
  return data.data.remaining as PendingCounts;
}

async function sendBatch(
  eventId: string,
  guestType: 'single' | 'double'
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  remaining: PendingCounts;
}> {
  const res = await fetch('/api/guests/send-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, guest_type: guestType, batch_size: 10 }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Batch send failed');
  }
  return data.data;
}

async function runPhase(
  eventId: string,
  guestType: 'single' | 'double',
  initialTotal: number,
  onProgress: (sent: number, failed: number, total: number) => void
): Promise<PhaseStats> {
  let sent = 0;
  let failed = 0;
  const total = initialTotal;

  while (true) {
    const result = await sendBatch(eventId, guestType);
    sent += result.succeeded;
    failed += result.failed;
    onProgress(sent, failed, total);

    const remaining =
      guestType === 'double' ? result.remaining.double : result.remaining.single;
    if (remaining === 0 || result.processed === 0) {
      break;
    }
  }

  return { sent, failed, total };
}

export function SendInvitationsButton({ eventId }: SendInvitationsButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doubleStats, setDoubleStats] = useState<PhaseStats>({ sent: 0, failed: 0, total: 0 });
  const [singleStats, setSingleStats] = useState<PhaseStats>({ sent: 0, failed: 0, total: 0 });
  const [progressLabel, setProgressLabel] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  function reset() {
    setPhase('idle');
    setError('');
    setDoubleStats({ sent: 0, failed: 0, total: 0 });
    setSingleStats({ sent: 0, failed: 0, total: 0 });
    setProgressLabel('');
    setProgressCurrent(0);
    setProgressTotal(0);
  }

  async function handleConfirmSend() {
    setLoading(true);
    setError('');
    setPhase('double');

    try {
      const pending = await fetchPendingCounts(eventId);

      if (pending.double === 0 && pending.single === 0) {
        setPhase('done');
        setError('Hakuna wageni wenye status Pending kwa tukio hili.');
        return;
      }

      let doubleResult: PhaseStats = { sent: 0, failed: 0, total: pending.double };
      if (pending.double > 0) {
        setPhase('double');
        doubleResult = await runPhase(eventId, 'double', pending.double, (sent, _failed, total) => {
          setProgressLabel('Inatuma kwa Double...');
          setProgressCurrent(sent);
          setProgressTotal(total);
        });
        setDoubleStats(doubleResult);
      }

      let singleResult: PhaseStats = { sent: 0, failed: 0, total: pending.single };
      if (pending.single > 0) {
        setPhase('single');
        singleResult = await runPhase(eventId, 'single', pending.single, (sent, _failed, total) => {
          setProgressLabel('Inatuma kwa Single...');
          setProgressCurrent(sent);
          setProgressTotal(total);
        });
        setSingleStats(singleResult);
      }

      setDoubleStats(doubleResult);
      setSingleStats(singleResult);
      setPhase('done');
    } catch (err) {
      console.error('Send invitations error:', err);
      setError(err instanceof Error ? err.message : 'Imeshindwa kutuma mialiko');
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }

  const totalFailed = doubleStats.failed + singleStats.failed;

  return (
    <div className="space-y-4">
      {phase === 'idle' && (
        <Button onClick={() => setPhase('confirm')}>Tuma Mialiko</Button>
      )}

      {phase === 'confirm' && (
        <Card padding="md" className="space-y-4 border border-primary/30">
          <p className="text-sm text-neutral-text">
            Hii itatuma SMS na WhatsApp kwa wageni WOTE wenye status &apos;Pending&apos; wa
            event hii. Endelea?
          </p>
          <div className="flex gap-3">
            <Button onClick={handleConfirmSend} loading={loading}>
              Endelea
            </Button>
            <Button variant="outline" onClick={reset} disabled={loading}>
              Ghairi
            </Button>
          </div>
        </Card>
      )}

      {(phase === 'double' || phase === 'single') && loading && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <p className="text-sm font-medium text-neutral-text">{progressLabel}</p>
          </div>
          <p className="text-sm text-neutral-muted">
            {progressCurrent} / {progressTotal} zimetumwa
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
      )}

      {phase === 'error' && (
        <Card padding="md" className="space-y-3">
          <Alert variant="error" message={error} />
          <Button onClick={() => setPhase('confirm')}>Jaribu Tena</Button>
        </Card>
      )}

      {phase === 'done' && !error && (
        <Card padding="md" className="space-y-3 border border-accent-success/30 bg-accent-success/5">
          <p className="text-sm font-semibold text-accent-success">✅ Imekamilika!</p>
          <p className="text-sm text-neutral-text">
            Double: {doubleStats.sent} zimetumwa.
            {doubleStats.failed > 0 && ` (${doubleStats.failed} zilishindwa)`}
          </p>
          <p className="text-sm text-neutral-text">
            Single: {singleStats.sent} zimetumwa.
            {singleStats.failed > 0 && ` (${singleStats.failed} zilishindwa)`}
          </p>
          {totalFailed > 0 && (
            <p className="text-sm text-accent-warning">
              {totalFailed} zilishindwa — angalia status ya guest binafsi.
            </p>
          )}
          <Button variant="outline" onClick={reset}>
            Funga
          </Button>
        </Card>
      )}

      {phase === 'done' && error && (
        <Alert variant="warning" message={error} />
      )}
    </div>
  );
}
