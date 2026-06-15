'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { GuestType } from '@/lib/database/types';
import { getGuestTypeBadgeLabel, guestTypeBadgeClass } from '@/lib/guest-type';

type CheckinResult = {
  success: boolean;
  alreadyCheckedIn?: boolean;
  error?: string;
  message?: string;
  data?: {
    name: string;
    event_name?: string;
    checked_in_at?: string;
    guest_type?: GuestType;
  };
};

type RecentCheckin = {
  name: string;
  checked_in_at: string;
};

function extractCode(decodedText: string): string {
  const trimmed = decodedText.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    return parts[parts.length - 1].split('?')[0];
  }
  return trimmed;
}

function formatCheckinTime(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function GuestTypeResultBadge({ guestType }: { guestType?: GuestType }) {
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${guestTypeBadgeClass(guestType)}`}
    >
      {getGuestTypeBadgeLabel(guestType, 'checkin')}
    </span>
  );
}

interface StaffEventScannerProps {
  eventId: string;
  onStatsUpdate?: (stats: {
    total_guests: number;
    checked_in_count: number;
    recent_checkins: RecentCheckin[];
  }) => void;
}

export function StaffEventScanner({ eventId, onStatsUpdate }: StaffEventScannerProps) {
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState({
    total_guests: 0,
    checked_in_count: 0,
    recent_checkins: [] as RecentCheckin[],
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const readerId = `qr-reader-${eventId}`;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/check-in/${eventId}/stats`);
      const data = await res.json();
      if (data.success) {
        const nextStats = {
          total_guests: data.data.total_guests,
          checked_in_count: data.data.checked_in_count,
          recent_checkins: data.data.recent_checkins ?? [],
        };
        setStats(nextStats);
        onStatsUpdate?.(nextStats);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  }, [eventId, onStatsUpdate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pauseScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause(true);
        setPaused(true);
      } catch (err) {
        console.error('Pause scanner error:', err);
      }
    }
  }, []);

  const submitCode = useCallback(
    async (code: string) => {
      const normalized = code.trim();
      if (!normalized) return;

      try {
        const res = await fetch('/api/staff/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalized, eventId }),
        });
        const data = await res.json();
        setResult(data);
        if (data.success) {
          await fetchStats();
        }
        await pauseScanner();
      } catch {
        setResult({ success: false, error: 'Network error' });
        await pauseScanner();
      }
    },
    [eventId, fetchStats, pauseScanner]
  );

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      const code = extractCode(decodedText);
      await submitCode(code);
    },
    [submitCode]
  );

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    const scanConfig = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
      videoConstraints: {
        width: { min: 640, ideal: 1280 },
        height: { min: 480, ideal: 720 },
        facingMode: 'environment',
      },
    };

    scanner
      .start(
        { facingMode: 'environment' },
        scanConfig,
        (decodedText) => {
          if (mounted && !isProcessingRef.current) {
            handleScan(decodedText);
          }
        },
        () => {}
      )
      .then(() => {
        if (mounted) setScanning(true);
      })
      .catch((err) => {
        console.error('Camera error:', err);
        if (mounted) {
          setCameraError(
            'Could not access camera. Use manual code entry below, or allow camera permission on HTTPS.'
          );
        }
      });

    return () => {
      mounted = false;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current = null;
        });
    };
  }, [handleScan, readerId]);

  async function handleManualCheckin() {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const code = manualCode;
    setManualCode('');
    await submitCode(code);
  }

  async function handleConfirmNext() {
    setResult(null);
    isProcessingRef.current = false;
    setPaused(false);

    if (scannerRef.current) {
      try {
        await scannerRef.current.resume();
      } catch (err) {
        console.error('Resume scanner error:', err);
      }
    }
  }

  function renderResult() {
    if (!result) return null;

    if (!result.success) {
      return (
        <Card padding="lg" className="border border-accent-error/40 bg-accent-error/10 text-center space-y-4">
          <p className="text-2xl font-bold text-accent-error">❌</p>
          <p className="text-lg font-semibold text-accent-error">
            QR Code haijulikani / si sahihi
          </p>
          {result.error && (
            <p className="text-small text-neutral-muted">{result.error}</p>
          )}
          <Button fullWidth onClick={handleConfirmNext}>
            Confirm / Scan Next
          </Button>
        </Card>
      );
    }

    if (result.alreadyCheckedIn) {
      const time = formatCheckinTime(result.data?.checked_in_at);
      return (
        <Card padding="lg" className="border border-accent-warning/40 bg-accent-warning/10 text-center space-y-4">
          <p className="text-2xl font-bold text-accent-warning">⚠️</p>
          <p className="text-lg font-semibold text-neutral-text">
            {result.data?.name} ALIKWISHA fika saa {time}
          </p>
          <GuestTypeResultBadge guestType={result.data?.guest_type} />
          <Button fullWidth onClick={handleConfirmNext}>
            Confirm / Scan Next
          </Button>
        </Card>
      );
    }

    return (
      <Card padding="lg" className="border border-accent-success/40 bg-accent-success/10 text-center space-y-4">
        <p className="text-2xl font-bold text-accent-success">✅</p>
        <p className="text-lg font-semibold text-neutral-text">
          {result.data?.name} - Karibu! Amesajiliwa kikamilifu.
        </p>
        <GuestTypeResultBadge guestType={result.data?.guest_type} />
        <Button fullWidth onClick={handleConfirmNext}>
          Confirm / Scan Next
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="md" className="text-center">
        <p className="text-small text-neutral-muted uppercase tracking-wide">Wamefika</p>
        <p className="text-4xl font-bold text-neutral-text mt-1">
          {stats.checked_in_count} / {stats.total_guests} guests
        </p>
      </Card>

      <Card padding="md">
        <p className="text-center text-small font-medium uppercase tracking-wide text-neutral-muted mb-4">
          📱 QR Scanner
        </p>
        <div className="mx-auto w-full" style={{ maxWidth: 400 }}>
          <div
            id={readerId}
            className="w-full overflow-hidden rounded-card"
            style={{ minHeight: scanning ? 260 : 120 }}
          />
        </div>
        {!scanning && !cameraError && (
          <p className="text-center text-small text-neutral-muted py-8">Starting camera...</p>
        )}
        {cameraError && <Alert variant="warning" message={cameraError} />}
        {paused && !result && (
          <p className="text-center text-small text-neutral-muted mt-2">Scanner paused</p>
        )}
      </Card>

      {renderResult()}

      <Card padding="md" className="space-y-4">
        <Input
          label="Manual code"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Au weka invitation code manually"
          onKeyDown={(e) => e.key === 'Enter' && !isProcessingRef.current && handleManualCheckin()}
          disabled={isProcessingRef.current && !!result}
        />
        <Button
          fullWidth
          onClick={handleManualCheckin}
          disabled={!manualCode.trim() || (isProcessingRef.current && !!result)}
        >
          Check In
        </Button>
      </Card>

      {stats.recent_checkins.length > 0 && (
        <Card padding="md">
          <h3 className="text-small font-semibold uppercase tracking-wide text-neutral-muted mb-4">
            Recent Check-ins
          </h3>
          <ul className="space-y-2">
            {stats.recent_checkins.map((checkin, i) => (
              <li
                key={`${checkin.name}-${checkin.checked_in_at}-${i}`}
                className="flex items-center justify-between text-sm text-neutral-text border-b border-neutral-border/50 pb-2 last:border-0"
              >
                <span>✓ {checkin.name}</span>
                <span className="text-neutral-muted">{formatCheckinTime(checkin.checked_in_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
