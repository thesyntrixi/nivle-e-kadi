'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ClientForm, ClientFormData } from '@/components/forms/ClientForm';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(data: ClientFormData) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          company_name: data.company_name.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to create client. Please try again.');
        return;
      }

      router.push('/clients');
    } catch (err) {
      console.error('Create client error:', err);
      setError('Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-h1 text-neutral-text">Add New Client</h2>
        <p className="text-neutral-muted mt-1">
          Enter the client&apos;s contact details to get started
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Could not create client" message={error} />
      )}

      <Card padding="lg">
        <ClientForm onSubmit={handleSubmit} isLoading={loading} />
      </Card>
    </div>
  );
}
