'use client';

import { useState } from 'react';
import { Guest } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

const GUEST_STATUSES: Guest['status'][] = [
  'Pending',
  'Sent',
  'Delivered',
  'Opened',
  'Failed',
];

interface GuestsTableProps {
  guests: Guest[];
  eventId: string;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
  deletingId?: string | null;
  searchQuery?: string;
}

function StatusBadge({ status }: { status: Guest['status'] }) {
  const styles: Record<Guest['status'], string> = {
    Pending: 'bg-neutral-muted/20 text-neutral-muted border-neutral-border',
    Sent: 'bg-primary/20 text-primary border-primary/30',
    Delivered: 'bg-accent-success/20 text-accent-success border-accent-success/40',
    Opened: 'bg-accent-info/20 text-accent-info border-accent-info/40',
    Failed: 'bg-accent-error/20 text-accent-error border-accent-error/40',
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-small font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function GuestsTable({
  guests,
  eventId,
  onDelete,
  onRefresh,
  deletingId = null,
  searchQuery = '',
}: GuestsTableProps) {
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<Guest['status']>('Pending');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const filtered = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      (g.email?.toLowerCase().includes(q) ?? false) ||
      g.invitation_code.toLowerCase().includes(q)
    );
  });

  function openEdit(guest: Guest) {
    setEditingGuest(guest);
    setEditName(guest.name);
    setEditPhone(guest.phone);
    setEditEmail(guest.email ?? '');
    setEditStatus(guest.status);
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editingGuest) return;

    setSaving(true);
    setEditError('');

    try {
      const response = await fetch(`/api/guests/${editingGuest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          status: editStatus,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setEditError(result.error || 'Failed to update guest.');
        return;
      }

      setEditingGuest(null);
      onRefresh();
    } catch (err) {
      console.error('Update guest error:', err);
      setEditError('Failed to update guest. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    await onDelete(id);
  }

  if (guests.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <div className="py-8">
          <span className="text-4xl mb-4 block" aria-hidden="true">👤</span>
          <h3 className="text-h3 text-neutral-text mb-2">No guests yet</h3>
          <p className="text-neutral-muted text-small mb-6">
            Import a guest list to start sending invitations for this event.
          </p>
        </div>
      </Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card padding="lg" className="text-center py-8">
        <p className="text-neutral-muted">No guests match your search.</p>
      </Card>
    );
  }

  return (
    <>
      <Card padding="sm" className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-border">
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Name</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Phone</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Email</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Code</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Status</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-neutral-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="px-4 py-4 text-sm font-medium text-neutral-text">{guest.name}</td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">{guest.phone}</td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">{guest.email ?? '—'}</td>
                  <td className="px-4 py-4 text-sm font-mono text-primary">{guest.invitation_code}</td>
                  <td className="px-4 py-4"><StatusBadge status={guest.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="!px-4 !py-2 text-small"
                        onClick={() => openEdit(guest)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="!px-4 !py-2 text-small"
                        loading={deletingId === guest.id}
                        onClick={() => handleDelete(guest.id, guest.name)}
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

      <div className="lg:hidden space-y-4">
        {filtered.map((guest) => (
          <Card key={guest.id} padding="md">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-h3 text-neutral-text">{guest.name}</h3>
                <StatusBadge status={guest.status} />
              </div>
              <div className="space-y-1 text-small text-neutral-muted">
                <p><span className="text-neutral-text font-medium">Phone:</span> {guest.phone}</p>
                <p><span className="text-neutral-text font-medium">Email:</span> {guest.email ?? '—'}</p>
                <p><span className="text-neutral-text font-medium">Code:</span>{' '}
                  <code className="text-primary">{guest.invitation_code}</code>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" fullWidth className="!py-2 text-small" onClick={() => openEdit(guest)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  className="!py-2 text-small"
                  loading={deletingId === guest.id}
                  onClick={() => handleDelete(guest.id, guest.name)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingGuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit guest"
        >
          <Card padding="lg" className="w-full max-w-md animate-slide-up">
            <h3 className="text-h3 text-neutral-text mb-4">Edit Guest</h3>

            {editError && (
              <div className="mb-4">
                <Alert variant="error" message={editError} />
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={saving}
              />
              <Input
                label="Phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={saving}
              />
              <Input
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={saving}
              />
              <div className="space-y-2">
                <label className="block text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Invitation Code
                </label>
                <p className="input-field bg-surface-hover cursor-not-allowed font-mono text-primary">
                  {editingGuest.invitation_code}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-status" className="block text-small font-medium uppercase tracking-wide text-neutral-muted">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Guest['status'])}
                  disabled={saving}
                  className="input-field appearance-none cursor-pointer w-full"
                >
                  {GUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" fullWidth onClick={() => setEditingGuest(null)} disabled={saving}>
                Cancel
              </Button>
              <Button fullWidth loading={saving} onClick={handleSaveEdit}>
                {saving ? 'Saving...' : 'Update Guest'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function GuestsTableLoading() {
  return (
    <Card padding="lg" className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="border-neutral-border border-t-primary" />
        <p className="text-small text-neutral-muted">Loading guests...</p>
      </div>
    </Card>
  );
}
