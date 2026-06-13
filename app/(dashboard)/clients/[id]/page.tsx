'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ClientForm, ClientFormData } from '@/components/forms/ClientForm';

interface EditClientPageProps {
  params: { id: string };
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    try {
      const response = await fetch(`/api/clients/${params.id}`);
      const data = await response.json();

      if (!data.success) {
        setFetchError(data.error || 'Failed to load client. Please try again.');
        return;
      }

      setClient(data.data);
    } catch (err) {
      console.error('Fetch client error:', err);
      setFetchError('Failed to load client. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  async function handleSubmit(data: ClientFormData) {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
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
        setError(result.error || 'Failed to update client. Please try again.');
        return;
      }

      router.push('/clients');
    } catch (err) {
      console.error('Update client error:', err);
      setError('Failed to update client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this client? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to delete client. Please try again.');
        return;
      }

      router.push('/clients');
    } catch (err) {
      console.error('Delete client error:', err);
      setError('Failed to delete client. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Card padding="lg" className="flex items-center justify-center py-16 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="border-neutral-border border-t-primary" />
          <p className="text-small text-neutral-muted">Loading client...</p>
        </div>
      </Card>
    );
  }

  if (fetchError || !client) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Alert
          variant="error"
          title="Client not found"
          message={fetchError || 'The client you are looking for does not exist.'}
        />
        <Button variant="outline" onClick={fetchClient}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-h1 text-neutral-text">Edit Client</h2>
        <p className="text-neutral-muted mt-1">
          Update contact details for {client.name}
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Something went wrong" message={error} />
      )}

      <Card padding="lg">
        <ClientForm
          initialData={client}
          onSubmit={handleSubmit}
          isLoading={submitting}
        />
      </Card>

      <Card padding="md" className="border-accent-error/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-h3 text-accent-error">Danger Zone</h3>
            <p className="text-small text-neutral-muted mt-1">
              Permanently remove this client and all associated data
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            disabled={submitting}
            className="shrink-0"
          >
            {deleting ? 'Deleting...' : 'Delete Client'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
