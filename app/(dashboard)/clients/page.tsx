'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Client } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ClientsTable, ClientsTableLoading } from '@/components/dashboard/ClientsTable';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load clients. Please try again.');
        return;
      }

      setClients(data.data);
    } catch (err) {
      console.error('Fetch clients error:', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete client. Please try again.');
        return;
      }

      setClients((prev) => prev.filter((client) => client.id !== id));
    } catch (err) {
      console.error('Delete client error:', err);
      setError('Failed to delete client. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h1 text-neutral-text">Clients</h2>
          <p className="text-neutral-muted mt-1">
            Manage your client accounts and contact information
          </p>
        </div>
        <Link href="/clients/new">
          <Button className="w-full sm:w-auto">+ New Client</Button>
        </Link>
      </div>

      {error && (
        <Alert
          variant="error"
          title="Something went wrong"
          message={error}
        />
      )}

      {error && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={fetchClients}>
            Try Again
          </Button>
        </div>
      )}

      {loading ? (
        <ClientsTableLoading />
      ) : (
        <ClientsTable
          clients={clients}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}
