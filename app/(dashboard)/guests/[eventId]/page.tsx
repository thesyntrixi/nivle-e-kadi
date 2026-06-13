'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import {
  GuestUploadForm,
  ColumnMapping,
} from '@/components/forms/GuestUploadForm';

interface ImportSummary {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface GuestEventPageProps {
  params: { eventId: string };
}

export default function GuestEventPage({ params }: GuestEventPageProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${params.eventId}`);
      const data = await response.json();
      if (data.success) {
        setEventName(data.data.name);
      } else {
        setError(data.error || 'Event not found');
      }
    } catch (err) {
      console.error('Fetch event error:', err);
      setError('Failed to load event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleUpload(file: File, mapping: ColumnMapping) {
    setImporting(true);
    setError('');
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_id', params.eventId);
      formData.append('column_mapping', JSON.stringify(mapping));

      const response = await fetch('/api/guests/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        if (result.data) {
          setSummary(result.data);
        }
        throw new Error(result.error || 'Failed to import guests. Please try again.');
      }

      setSummary(result.data);

      if (result.data.created > 0) {
        setTimeout(() => {
          router.push(`/guests?event_id=${params.eventId}`);
        }, 2500);
      }
    } catch (err) {
      console.error('Upload guests error:', err);
      throw err;
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-16 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="border-neutral-border border-t-primary" />
          <p className="text-small text-neutral-muted">Loading event...</p>
        </div>
      </Card>
    );
  }

  if (error && !eventName) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert variant="error" title="Event not found" message={error} />
        <Link href="/guests">
          <Button variant="outline">Back to Guests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link
          href={`/guests?event_id=${params.eventId}`}
          className="text-small text-primary hover:underline mb-2 inline-block"
        >
          ← Back to Guests
        </Link>
        <h2 className="text-h1 text-neutral-text">Import Guest List</h2>
        <p className="text-neutral-muted mt-1">
          Upload a CSV or Excel file to bulk import guests for {eventName}
        </p>
      </div>

      {summary && (
        <Alert
          variant={summary.created > 0 ? 'success' : 'warning'}
          title="Import Summary"
          message={[
            `Successfully imported ${summary.created} guest${summary.created === 1 ? '' : 's'}`,
            summary.skipped > 0 ? `${summary.skipped} duplicate${summary.skipped === 1 ? '' : 's'} skipped` : '',
            summary.errors.length > 0 ? `${summary.errors.length} row${summary.errors.length === 1 ? '' : 's'} had errors` : '',
            summary.created > 0 ? 'Redirecting to guest list...' : '',
          ].filter(Boolean).join('. ')}
        />
      )}

      {summary && summary.errors.length > 0 && (
        <Card padding="md" className="border-accent-error/30">
          <h3 className="text-h3 text-accent-error mb-3">Row Errors</h3>
          <ul className="space-y-1 text-small text-neutral-muted max-h-40 overflow-y-auto">
            {summary.errors.slice(0, 20).map((err, i) => (
              <li key={i}>
                Row {err.row}: {err.message}
              </li>
            ))}
            {summary.errors.length > 20 && (
              <li className="text-neutral-muted">...and {summary.errors.length - 20} more</li>
            )}
          </ul>
        </Card>
      )}

      <Card padding="lg">
        <GuestUploadForm
          eventId={params.eventId}
          eventName={eventName}
          onSubmit={handleUpload}
          isLoading={importing}
        />
      </Card>
    </div>
  );
}
