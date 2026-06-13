'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Client } from '@/lib/database/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export type ClientFormData = {
  name: string;
  email: string;
  phone: string;
  company_name: string;
};

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isLoading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

function validateForm(data: ClientFormData): Partial<Record<keyof ClientFormData, string>> {
  const errors: Partial<Record<keyof ClientFormData, string>> = {};

  if (!data.name.trim()) {
    errors.name = 'Client name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Name must be at most 100 characters';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Invalid email format';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!PHONE_REGEX.test(data.phone.trim())) {
    errors.phone = 'Phone number is invalid';
  }

  if (data.company_name.trim().length > 100) {
    errors.company_name = 'Company name must be at most 100 characters';
  }

  return errors;
}

export function ClientForm({ initialData, onSubmit, isLoading = false }: ClientFormProps) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? '');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [submitError, setSubmitError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError('');

    const formData: ClientFormData = {
      name,
      email,
      phone,
      company_name: companyName,
    };

    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
    }
  }

  function clearFieldError(field: keyof ClientFormData) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Submission failed" message={submitError} />
      )}

      <Input
        label="Client Name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          clearFieldError('name');
        }}
        placeholder="Enter client name"
        required
        disabled={isLoading}
        error={fieldErrors.name}
      />

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearFieldError('email');
        }}
        placeholder="client@example.com"
        required
        disabled={isLoading}
        error={fieldErrors.email}
      />

      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          clearFieldError('phone');
        }}
        placeholder="+255 712 345 678"
        required
        disabled={isLoading}
        error={fieldErrors.phone}
      />

      <Input
        label="Company Name"
        type="text"
        value={companyName}
        onChange={(e) => {
          setCompanyName(e.target.value);
          clearFieldError('company_name');
        }}
        placeholder="Optional company name"
        disabled={isLoading}
        error={fieldErrors.company_name}
      />

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Link href="/clients" className="flex-1">
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
              ? 'Update Client'
              : 'Create Client'}
        </Button>
      </div>
    </form>
  );
}
