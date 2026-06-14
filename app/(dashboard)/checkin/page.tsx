'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

type CheckinResult = {
  success: boolean;
  alreadyCheckedIn?: boolean;
  error?: string;
  message?: string;
  data?: {
    name: string;
    event_name?: string;
    checked_in_at?: string;
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

export default function CheckinPage() {
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const submitCode = useCallback(async (code: string) => {
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
    } catch {
      setResult({ success: false, error: 'Network error' });
    }
  }, []);

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const code = extractCode(decodedText);
      await submitCode(code);

      setTimeout(() => {
        isProcessingRef.current = false;
        setResult(null);
      }, 4000);
    },
    [submitCode]
  );

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (mounted) handleScan(decodedText);
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
    isProcessingRef.current = true;
    await submitCode(manualCode);
    setManualCode('');
    setTimeout(() => {
      isProcessingRef.current = false;
      setResult(null);
    }, 4000);
  }

  function renderResult() {
    if (!result) return null;

    if (!result.success) {
      return (
        <Alert
          variant="error"
          title="Check-in failed"
          message={result.error || 'Invalid QR code'}
        />
      );
    }

    if (result.alreadyCheckedIn) {
      return (
        <div className="p-4 rounded-card border border-accent-warning/40 bg-accent-warning/10">
          <p className="font-semibold text-accent-warning">⚠️ Already checked in</p>
          <p className="text-sm text-neutral-text mt-1">
            {result.data?.name}
            {result.data?.event_name ? ` — ${result.data.event_name}` : ''}
          </p>
          <p className="text-small text-neutral-muted mt-1">{result.message}</p>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-card border border-accent-success/40 bg-accent-success/10">
        <p className="font-semibold text-accent-success">✅ Karibu {result.data?.name}!</p>
        {result.data?.event_name && (
          <p className="text-sm text-neutral-text mt-1">{result.data.event_name}</p>
        )}
        <p className="text-small text-neutral-muted mt-1">{result.message}</p>
      </div>
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

      <Card padding="md">
        <div
          id="qr-reader"
          className="w-full overflow-hidden rounded-card"
          style={{ minHeight: scanning ? 280 : 120 }}
        />
        {!scanning && !cameraError && (
          <p className="text-center text-small text-neutral-muted py-8">Starting camera...</p>
        )}
        {cameraError && (
          <Alert variant="warning" message={cameraError} />
        )}
      </Card>

      {renderResult()}

      <Card padding="md" className="space-y-4">
        <Input
          label="Manual code"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Au weka invitation code manually"
          onKeyDown={(e) => e.key === 'Enter' && handleManualCheckin()}
        />
        <Button fullWidth onClick={handleManualCheckin} disabled={!manualCode.trim()}>
          Check In
        </Button>
      </Card>
    </div>
  );
}
