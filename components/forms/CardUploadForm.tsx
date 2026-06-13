'use client';

import { DragEvent, useCallback, useRef, useState } from 'react';
import { Event } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf'];
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

interface CardUploadFormProps {
  onSubmit: (file: File, eventId?: string) => Promise<void>;
  isLoading?: boolean;
  events?: Event[];
  eventsLoading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
    return 'Invalid file type. Only PNG, JPG, and PDF allowed';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit';
  }
  return null;
}

export function CardUploadForm({
  onSubmit,
  isLoading = false,
  events = [],
  eventsLoading = false,
}: CardUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [eventId, setEventId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  function handleFileSelect(file: File) {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      clearPreview();
      return;
    }

    setFileError('');
    setSelectedFile(file);
    clearPreview();

    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

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
    if (file) handleFileSelect(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!selectedFile) {
      setFileError('Please select a file');
      return;
    }

    const error = validateFile(selectedFile);
    if (error) {
      setFileError(error);
      return;
    }

    setProgress(10);

    try {
      await onSubmit(selectedFile, eventId || undefined);
      setProgress(100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'File upload failed. Please try again.';
      setSubmitError(message);
      setProgress(0);
    }
  }

  const isPdf = selectedFile?.type === 'application/pdf';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Upload failed" message={submitError} />
      )}

      <div className="space-y-2">
        <label
          htmlFor="event-select"
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          Event
        </label>
        <select
          id="event-select"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          disabled={isLoading || eventsLoading}
          className="input-field appearance-none cursor-pointer w-full"
        >
          <option value="">
            {eventsLoading ? 'Loading events...' : 'Select an event (required)'}
          </option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
        <p className="text-small text-neutral-muted">
          Link this card template to an event for personalized invitations.
        </p>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-card p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragActive ? 'border-primary bg-primary/5' : 'border-neutral-border hover:border-primary/50 hover:bg-surface-hover/30'}
          ${fileError ? 'border-accent-error/50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          onChange={onFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        {previewUrl && !isPdf ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Card preview"
              className="mx-auto max-h-48 rounded-input object-contain"
            />
            <p className="text-small text-neutral-muted">Click or drag to replace file</p>
          </div>
        ) : selectedFile && isPdf ? (
          <div className="space-y-2">
            <span className="text-4xl block" aria-hidden="true">📄</span>
            <p className="text-neutral-text font-medium">{selectedFile.name}</p>
            <p className="text-small text-neutral-muted">PDF document ready to upload</p>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-4xl block" aria-hidden="true">🎨</span>
            <p className="text-neutral-text font-medium">
              Drag & drop your card here
            </p>
            <p className="text-small text-neutral-muted">
              or click to browse — PNG, JPG, PDF (max 5MB)
            </p>
          </div>
        )}
      </div>

      {fileError && (
        <p className="text-small text-accent-error" role="alert">
          {fileError}
        </p>
      )}

      {selectedFile && (
        <div className="p-4 rounded-input bg-surface-hover/50 border border-neutral-border text-small space-y-1">
          <p className="text-neutral-text">
            <span className="font-medium">File:</span> {selectedFile.name}
          </p>
          <p className="text-neutral-muted">
            <span className="font-medium text-neutral-text">Size:</span>{' '}
            {formatFileSize(selectedFile.size)}
          </p>
          <p className="text-neutral-muted">
            <span className="font-medium text-neutral-text">Type:</span>{' '}
            {selectedFile.type || selectedFile.name.split('.').pop()?.toUpperCase()}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(progress, 30)}%` }}
            />
          </div>
          <p className="text-small text-neutral-muted text-center">Uploading card...</p>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          fullWidth
          disabled={isLoading}
          onClick={() => window.history.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={!selectedFile}
          className="flex-1"
        >
          {isLoading ? 'Uploading...' : 'Upload Card'}
        </Button>
      </div>
    </form>
  );
}
