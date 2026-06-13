'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Client, Event } from '@/lib/database/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export const EVENT_TYPES: Event['type'][] = [
  'Wedding',
  'Birthday',
  'Conference',
  'Corporate',
  'Other',
];

export const EVENT_STATUSES: Event['status'][] = ['Draft', 'Active', 'Completed'];

export type EventFormData = {
  client_id: string;
  name: string;
  type: Event['type'];
  date: string;
  time: string;
  venue: string;
  location_link: string;
  status: Event['status'];
};

interface EventFormProps {
  initialData?: Event;
  clients: Client[];
  onSubmit: (data: EventFormData) => Promise<void>;
  isLoading?: boolean;
  clientsLoading?: boolean;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const URL_REGEX = /^https?:\/\/.+/i;

function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function validateForm(data: EventFormData): Partial<Record<keyof EventFormData, string>> {
  const errors: Partial<Record<keyof EventFormData, string>> = {};

  if (!data.client_id) {
    errors.client_id = 'Client is required';
  }
  if (!data.name.trim()) {
    errors.name = 'Event name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Event name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Event name must be at most 100 characters';
  }
  if (!data.date) {
    errors.date = 'Date is required';
  } else if (Number.isNaN(Date.parse(data.date))) {
    errors.date = 'Invalid date format';
  }
  if (data.time && !TIME_REGEX.test(data.time)) {
    errors.time = 'Invalid time format (use HH:MM)';
  }
  if (data.venue.trim().length > 100) {
    errors.venue = 'Venue must be at most 100 characters';
  }
  if (data.location_link.trim() && !URL_REGEX.test(data.location_link.trim())) {
    errors.location_link = 'Location link must be a valid URL';
  }

  return errors;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  required,
}: SelectFieldProps) {
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
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        className={`input-field appearance-none cursor-pointer ${error ? 'input-field-error' : ''}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-small text-accent-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function EventForm({
  initialData,
  clients,
  onSubmit,
  isLoading = false,
  clientsLoading = false,
}: EventFormProps) {
  const isEdit = !!initialData;
  const [clientId, setClientId] = useState(initialData?.client_id ?? '');
  const [clientSearch, setClientSearch] = useState('');
  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState<Event['type']>(initialData?.type ?? 'Wedding');
  const [date, setDate] = useState(
    initialData ? formatDateForInput(initialData.date) : ''
  );
  const [time, setTime] = useState(
    initialData ? formatTimeForInput(initialData.time) : ''
  );
  const [venue, setVenue] = useState(initialData?.venue ?? '');
  const [locationLink, setLocationLink] = useState(initialData?.location_link ?? '');
  const [status, setStatus] = useState<Event['status']>(
    initialData?.status ?? 'Draft'
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof EventFormData, string>>
  >({});
  const [submitError, setSubmitError] = useState('');

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(search));
  }, [clients, clientSearch]);

  const clientOptions = useMemo(() => {
    const opts = [{ value: '', label: clientsLoading ? 'Loading clients...' : 'Select a client' }];
    filteredClients.forEach((c) => opts.push({ value: c.id, label: c.name }));
    return opts;
  }, [filteredClients, clientsLoading]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError('');

    const formData: EventFormData = {
      client_id: clientId,
      name,
      type,
      date,
      time,
      venue,
      location_link: locationLink,
      status,
    };

    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
    }
  }

  function clearFieldError(field: keyof EventFormData) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  if (!clientsLoading && clients.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-muted mb-4">No clients found. Add a client before creating an event.</p>
        <Link href="/clients/new">
          <Button>Add Client</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Submission failed" message={submitError} />
      )}

      <div className="space-y-2">
        <Input
          label="Search Client"
          type="text"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Filter clients by name..."
          disabled={isLoading || clientsLoading}
        />
        <SelectField
          label="Client"
          value={clientId}
          onChange={(v) => {
            setClientId(v);
            clearFieldError('client_id');
          }}
          options={clientOptions}
          error={fieldErrors.client_id}
          disabled={isLoading || clientsLoading}
          required
        />
      </div>

      <Input
        label="Event Name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          clearFieldError('name');
        }}
        placeholder="e.g. Sarah & John's Wedding"
        required
        disabled={isLoading}
        error={fieldErrors.name}
      />

      <SelectField
        label="Event Type"
        value={type}
        onChange={(v) => setType(v as Event['type'])}
        options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
        disabled={isLoading}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            clearFieldError('date');
          }}
          required
          disabled={isLoading}
          error={fieldErrors.date}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            clearFieldError('time');
          }}
          disabled={isLoading}
          error={fieldErrors.time}
        />
      </div>

      <Input
        label="Venue"
        type="text"
        value={venue}
        onChange={(e) => {
          setVenue(e.target.value);
          clearFieldError('venue');
        }}
        placeholder="e.g. Serena Hotel, Dar es Salaam"
        disabled={isLoading}
        error={fieldErrors.venue}
      />

      <Input
        label="Location Link"
        type="url"
        value={locationLink}
        onChange={(e) => {
          setLocationLink(e.target.value);
          clearFieldError('location_link');
        }}
        placeholder="https://maps.google.com/..."
        disabled={isLoading}
        error={fieldErrors.location_link}
      />

      <SelectField
        label="Status"
        value={status}
        onChange={(v) => setStatus(v as Event['status'])}
        options={EVENT_STATUSES.map((s) => ({ value: s, label: s }))}
        disabled={isLoading}
        required
      />

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Link href="/events" className="flex-1">
          <Button type="button" variant="outline" fullWidth disabled={isLoading}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" fullWidth loading={isLoading} className="flex-1">
          {isLoading
            ? isEdit
              ? 'Updating...'
              : 'Creating...'
            : isEdit
              ? 'Update Event'
              : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
