'use client';

import { useRef, useState } from 'react';
import { GuestType } from '@/lib/database/types';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

type ImportSummary = {
  inserted: number;
  skipped_invalid: number;
  skipped_duplicate: number;
  guest_type: GuestType;
  errors: Array<{ row: number; value: string }>;
  duplicates: Array<{ row: number; name: string; phone: string }>;
};

interface BulkImportGuestsFormProps {
  events: Array<{ id: string; name: string }>;
  defaultEventId?: string;
  onSuccess?: () => void;
}

function UploadSection({
  label,
  guestType,
  eventId,
  disabled,
  onResult,
}: {
  label: string;
  guestType: GuestType;
  eventId: string;
  disabled: boolean;
  onResult: (summary: ImportSummary) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!eventId) {
      setError('Chagua tukio kwanza');
      e.target.value = '';
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_id', eventId);
      formData.append('guest_type', guestType);

      const response = await fetch('/api/guests/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Import failed');
        return;
      }

      onResult(data.data as ImportSummary);
    } catch {
      setError('Import failed. Please try again.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <Card padding="md" className="space-y-3 flex-1">
      <p className="text-sm font-semibold text-neutral-text">{label}</p>
      <p className="text-xs text-neutral-muted">
        Safu: Jina/Name na Namba/Phone (.xlsx, .xls, .csv)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={disabled || loading}
        className="block w-full text-small text-neutral-muted file:mr-3 file:py-2 file:px-4 file:rounded-input file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90 disabled:opacity-50"
      />
      {loading && (
        <div className="flex items-center gap-2 text-small text-neutral-muted">
          <Spinner size="sm" />
          Inapakia na kusindika...
        </div>
      )}
      {error && <Alert variant="error" message={error} />}
    </Card>
  );
}

function SummaryDisplay({ summary }: { summary: ImportSummary }) {
  const typeLabel = summary.guest_type === 'double' ? 'DOUBLE' : 'SINGLE';

  return (
    <Card padding="md" className="space-y-3 border border-accent-success/30 bg-accent-success/5">
      <p className="text-sm font-semibold text-accent-success">
        ✅ Imeongezwa wageni {summary.inserted} ({typeLabel})
      </p>

      {summary.skipped_invalid > 0 && (
        <div className="text-small text-accent-warning space-y-1">
          <p>
            ⚠️ Mistari {summary.skipped_invalid} ilikuwa na namba za simu zisizo sahihi (zimepuuzwa)
          </p>
          <p className="text-neutral-muted">
            Mistari: {summary.errors.map((e) => e.row).join(', ')}
          </p>
        </div>
      )}

      {summary.skipped_duplicate > 0 && (
        <div className="text-small text-accent-warning space-y-1">
          <p>
            ⚠️ Wageni {summary.skipped_duplicate} tayari wapo (namba zinazofanana) - zimepuuzwa
          </p>
          <ul className="text-neutral-muted list-disc list-inside">
            {summary.duplicates.slice(0, 5).map((d) => (
              <li key={`${d.row}-${d.phone}`}>
                Mstari {d.row}: {d.name} ({d.phone})
              </li>
            ))}
            {summary.duplicates.length > 5 && (
              <li>...na {summary.duplicates.length - 5} zaidi</li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function BulkImportGuestsForm({
  events,
  defaultEventId = '',
  onSuccess,
}: BulkImportGuestsFormProps) {
  const [eventId, setEventId] = useState(defaultEventId);
  const [summaries, setSummaries] = useState<ImportSummary[]>([]);

  function handleResult(summary: ImportSummary) {
    setSummaries((prev) => [summary, ...prev].slice(0, 4));
    if (summary.inserted > 0) {
      onSuccess?.();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="bulk-event-select"
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          Chagua Tukio
        </label>
        <select
          id="bulk-event-select"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="input-field appearance-none cursor-pointer w-full"
        >
          <option value="">Chagua tukio...</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {!eventId && (
        <Alert variant="warning" message="Chagua tukio kabla ya kupakia faili" />
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <UploadSection
          label="👤 Pakia Wageni - SINGLE"
          guestType="single"
          eventId={eventId}
          disabled={!eventId}
          onResult={handleResult}
        />
        <UploadSection
          label="👥 Pakia Wageni - DOUBLE"
          guestType="double"
          eventId={eventId}
          disabled={!eventId}
          onResult={handleResult}
        />
      </div>

      {summaries.length > 0 && (
        <div className="space-y-3">
          <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
            Matokeo ya Uingizaji
          </p>
          {summaries.map((summary, i) => (
            <SummaryDisplay key={`${summary.guest_type}-${i}-${summary.inserted}`} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
