'use client';

import Link from 'next/link';
import { Client } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface ClientsTableProps {
  clients: Client[];
  onDelete: (id: string) => Promise<void>;
  deletingId?: string | null;
}

export function ClientsTable({ clients, onDelete, deletingId = null }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <div className="py-8">
          <span className="text-4xl mb-4 block" aria-hidden="true">
            👥
          </span>
          <h3 className="text-h3 text-neutral-text mb-2">No clients yet</h3>
          <p className="text-neutral-muted text-small mb-6">
            Get started by adding your first client to manage their events and invitations.
          </p>
          <Link href="/clients/new">
            <Button>Add Your First Client</Button>
          </Link>
        </div>
      </Card>
    );
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    await onDelete(id);
  }

  return (
    <>
      {/* Desktop table */}
      <Card padding="sm" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-border">
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Email
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Phone
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Company
                </th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-neutral-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="px-4 py-4 text-sm font-medium text-neutral-text">
                    {client.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">
                    {client.email ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">{client.phone}</td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">
                    {client.company_name ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="outline" className="!px-4 !py-2 text-small">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        className="!px-4 !py-2 text-small"
                        loading={deletingId === client.id}
                        onClick={() => handleDelete(client.id, client.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {clients.map((client) => (
          <Card key={client.id} padding="md">
            <div className="space-y-3">
              <div>
                <h3 className="text-h3 text-neutral-text">{client.name}</h3>
                {client.company_name && (
                  <p className="text-small text-neutral-muted mt-1">{client.company_name}</p>
                )}
              </div>

              <div className="space-y-1 text-small">
                <p className="text-neutral-muted">
                  <span className="text-neutral-text font-medium">Email: </span>
                  {client.email ?? '—'}
                </p>
                <p className="text-neutral-muted">
                  <span className="text-neutral-text font-medium">Phone: </span>
                  {client.phone}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href={`/clients/${client.id}`} className="flex-1">
                  <Button variant="outline" fullWidth className="!py-2 text-small">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  fullWidth
                  className="!py-2 text-small flex-1"
                  loading={deletingId === client.id}
                  onClick={() => handleDelete(client.id, client.name)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function ClientsTableLoading() {
  return (
    <Card padding="lg" className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="border-neutral-border border-t-primary" />
        <p className="text-small text-neutral-muted">Loading clients...</p>
      </div>
    </Card>
  );
}
