'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Event, GuestType } from '@/lib/database/types';
import { getGuestTypeBadgeLabel, guestTypeBadgeClass } from '@/lib/guest-type';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { checkinQrScanConfig } from '@/components/checkin/qr-scan-config';

type CheckinStats = {
  checkedIn: number;
  total: number;
};

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

export default function CheckinPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stats, setStats] = useState<CheckinStats>({ checkedIn: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportError, setReportError] = useState('');

  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [paused, setPaused] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const fetchCheckinStats = useCallback(async (eventId: string) => {
    if (!eventId) {
      setStats({ checkedIn: 0, total: 0 });
      return;
    }

    setLoadingStats(true);
    try {
      const res = await fetch(`/api/checkin/stats?event_id=${encodeURIComponent(eventId)}`);
      const data = await res.json();
      if (data.success) {
        setStats({ checkedIn: data.checkedIn, total: data.total });
      }
    } catch (err) {
      console.error('Fetch check-in stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEvents(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCheckinStats(selectedEventId);
  }, [selectedEventId, fetchCheckinStats]);

  useEffect(() => {
    setReportMessage('');
    setReportError('');
  }, [selectedEventId]);

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
        const res = await fetch('/api/guests/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalized }),
        });
        const data = await res.json();
        setResult(data);
        if (data.success) {
          await fetchCheckinStats(selectedEventId);
        }
        await pauseScanner();
      } catch {
        setResult({ success: false, error: 'Network error' });
        await pauseScanner();
      }
    },
    [fetchCheckinStats, pauseScanner, selectedEventId]
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
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const scanConfig = checkinQrScanConfig;

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
  }, [handleScan]);

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

    if (selectedEventId) {
      await fetchCheckinStats(selectedEventId);
    }
  }

  async function handleSendReport() {
    if (!selectedEventId || sendingReport) return;

    const confirmed = window.confirm(
      'Tuma report ya check-in kwa nivle.ekadi@gmail.com?'
    );
    if (!confirmed) return;

    setSendingReport(true);
    setReportMessage('');
    setReportError('');

    try {
      const res = await fetch('/api/checkin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEventId }),
      });
      const data = await res.json();
      if (data.success) {
        setReportMessage(data.message || 'Ripoti imetumwa kwa nivle.ekadi@gmail.com');
      } else {
        setReportError(data.message || data.error || 'Imeshindwa kutuma ripoti');
      }
    } catch {
      setReportError('Imeshindwa kutuma ripoti');
    } finally {
      setSendingReport(false);
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
          {result.data?.event_name && (
            <p className="text-small text-neutral-muted">{result.data.event_name}</p>
          )}
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
        {result.data?.event_name && (
          <p className="text-small text-neutral-muted">{result.data.event_name}</p>
        )}
        <GuestTypeResultBadge guestType={result.data?.guest_type} />
        <Button fullWidth onClick={handleConfirmNext}>
          Confirm / Scan Next
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div>
        <h2 className="text-h1 text-neutral-text">Check-in Scanner</h2>
        <p className="text-neutral-muted mt-1 text-small">
          Scan guest QR codes or enter invitation code manually
        </p>
      </div>

      <Card padding="md" className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="event-select"
            className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
          >
            Select Event
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="input-field appearance-none cursor-pointer w-full"
          >
            <option value="">Choose an event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center py-2">
          <p className="text-3xl md:text-4xl font-bold text-neutral-text mt-1">
            {loadingStats
              ? 'Wamefika: —'
              : `Wamefika: ${stats.checkedIn}/${stats.total}`}
          </p>
        </div>

        <Button
          fullWidth
          variant="outline"
          onClick={handleSendReport}
          disabled={!selectedEventId || sendingReport}
          loading={sendingReport}
        >
          Tuma Report
        </Button>
        {reportMessage && <Alert variant="success" message={reportMessage} />}
        {reportError && <Alert variant="error" message={reportError} />}
      </Card>

      <Card padding="md">
        <div className="mx-auto w-full" style={{ maxWidth: 400 }}>
          <div
            id="qr-reader"
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
    </div>
  );
}
