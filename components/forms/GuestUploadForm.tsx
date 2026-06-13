'use client';

import { DragEvent, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface ColumnMapping {
  nameColumn: number;
  phoneColumn: number;
  emailColumn?: number;
  hasHeader?: boolean;
}

interface GuestUploadFormProps {
  eventId: string;
  eventName?: string;
  onSubmit: (file: File, mapping: ColumnMapping) => Promise<void>;
  isLoading?: boolean;
}

function detectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => String(h).toLowerCase().trim());
  let nameColumn = lower.findIndex((h) => h.includes('name'));
  let phoneColumn = lower.findIndex(
    (h) => h.includes('phone') || h.includes('mobile') || h.includes('tel')
  );
  let emailColumn = lower.findIndex((h) => h.includes('email'));

  if (nameColumn < 0) nameColumn = 0;
  if (phoneColumn < 0) phoneColumn = nameColumn === 0 ? 1 : 0;
  if (emailColumn < 0) emailColumn = -1;

  return {
    nameColumn,
    phoneColumn,
    emailColumn: emailColumn >= 0 ? emailColumn : undefined,
    hasHeader: true,
  };
}

async function parseFile(file: File): Promise<string[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (ext === 'csv') {
    const text = new TextDecoder().decode(buffer);
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      throw new Error('Failed to parse CSV file');
    }
    return parsed.data;
  }

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
  }) as string[][];
}

export function GuestUploadForm({
  eventId,
  eventName,
  onSubmit,
  isLoading = false,
}: GuestUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameColumn: 0,
    phoneColumn: 1,
    emailColumn: 2,
    hasHeader: true,
  });
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columnOptions = rawRows.length > 0
    ? Array.from(
        { length: Math.max(...rawRows.slice(0, 5).map((r) => r.length), 3) },
        (_, i) => ({
          value: i,
          label: mapping.hasHeader
            ? String(rawRows[0]?.[i] ?? `Column ${i + 1}`)
            : `Column ${i + 1}`,
        })
      )
    : [];

  const previewRows = mapping.hasHeader ? rawRows.slice(1, 6) : rawRows.slice(0, 5);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setParseError('Invalid file type. Only CSV and Excel allowed.');
      return;
    }

    setParseError('');
    setSelectedFile(file);

    try {
      const rows = await parseFile(file);
      setRawRows(rows);

      if (rows.length > 0) {
        const detected = detectColumns(rows[0].map(String));
        setMapping(detected);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError('Failed to parse file. Please check the format.');
      setRawRows([]);
    }
  }, []);

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!selectedFile) {
      setParseError('Please select a file');
      return;
    }

    setProgress(20);

    try {
      await onSubmit(selectedFile, mapping);
      setProgress(100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import guests. Please try again.';
      setSubmitError(message);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Import failed" message={submitError} />
      )}

      {parseError && (
        <Alert variant="error" title="File error" message={parseError} />
      )}

      <div className="p-4 rounded-input bg-surface-hover/50 border border-neutral-border">
        <p className="text-small text-neutral-muted">Event</p>
        <p className="text-neutral-text font-medium mt-1">
          {eventName ?? eventId}
        </p>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-card p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragActive ? 'border-primary bg-primary/5' : 'border-neutral-border hover:border-primary/50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
          className="hidden"
          disabled={isLoading}
        />
        <span className="text-4xl block mb-2" aria-hidden="true">📋</span>
        <p className="text-neutral-text font-medium">
          Drag & drop your guest list here
        </p>
        <p className="text-small text-neutral-muted mt-1">
          CSV or Excel (.csv, .xlsx, .xls)
        </p>
        {selectedFile && (
          <p className="text-small text-primary mt-3">{selectedFile.name}</p>
        )}
      </div>

      <div className="p-4 rounded-input bg-accent-info/5 border border-accent-info/20 text-small">
        <p className="font-semibold text-accent-info mb-2">Expected Format</p>
        <code className="block text-neutral-muted bg-surface-hover p-2 rounded">
          Name,Phone,Email<br />
          John Doe,+255712345678,john@example.com<br />
          Jane Smith,+255787654321,jane@example.com
        </code>
      </div>

      {rawRows.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <input
              id="has-header"
              type="checkbox"
              checked={mapping.hasHeader ?? true}
              onChange={(e) =>
                setMapping((m) => ({ ...m, hasHeader: e.target.checked }))
              }
              className="rounded border-neutral-border"
            />
            <label htmlFor="has-header" className="text-small text-neutral-text">
              First row is a header
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColumnSelect
              label="Name Column"
              value={mapping.nameColumn}
              options={columnOptions}
              onChange={(v) => setMapping((m) => ({ ...m, nameColumn: v }))}
            />
            <ColumnSelect
              label="Phone Column"
              value={mapping.phoneColumn}
              options={columnOptions}
              onChange={(v) => setMapping((m) => ({ ...m, phoneColumn: v }))}
            />
            <ColumnSelect
              label="Email Column (optional)"
              value={mapping.emailColumn ?? -1}
              options={[{ value: -1, label: 'None' }, ...columnOptions]}
              onChange={(v) =>
                setMapping((m) => ({
                  ...m,
                  emailColumn: v >= 0 ? v : undefined,
                }))
              }
            />
          </div>

          <div>
            <p className="text-small font-medium uppercase tracking-wide text-neutral-muted mb-3">
              Preview (first {previewRows.length} rows)
            </p>
            <div className="overflow-x-auto rounded-input border border-neutral-border">
              <table className="w-full text-left text-small">
                <thead>
                  <tr className="bg-surface-hover border-b border-neutral-border">
                    <th className="px-3 py-2 text-neutral-muted">Name</th>
                    <th className="px-3 py-2 text-neutral-muted">Phone</th>
                    <th className="px-3 py-2 text-neutral-muted">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-neutral-border/50 last:border-0">
                      <td className="px-3 py-2 text-neutral-text">
                        {String(row[mapping.nameColumn] ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-neutral-muted">
                        {String(row[mapping.phoneColumn] ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-neutral-muted">
                        {mapping.emailColumn !== undefined
                          ? String(row[mapping.emailColumn] ?? '—')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-small text-neutral-muted mt-2">
              {rawRows.length - (mapping.hasHeader ? 1 : 0)} data rows detected
            </p>
          </div>
        </>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(progress, 40)}%` }}
            />
          </div>
          <p className="text-small text-neutral-muted text-center">Importing guests...</p>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Link href={`/guests?event_id=${eventId}`} className="flex-1">
          <Button type="button" variant="outline" fullWidth disabled={isLoading}>
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={!selectedFile || rawRows.length === 0}
          className="flex-1"
        >
          {isLoading ? 'Importing...' : 'Import Guests'}
        </Button>
      </div>
    </form>
  );
}

function ColumnSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field appearance-none cursor-pointer w-full"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
