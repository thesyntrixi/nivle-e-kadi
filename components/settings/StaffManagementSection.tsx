'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Event } from '@/lib/database/types';

type StaffMember = {
  id: string;
  email: string;
  created_at: string;
  events: Array<{ id: string; name: string; date: string }>;
};

function staffDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StaffManagementSection() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, eventsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/events'),
      ]);
      const staffData = await staffRes.json();
      const eventsData = await eventsRes.json();

      if (staffData.success) {
        setStaffList(staffData.data);
      } else {
        setError(staffData.error || 'Failed to load staff');
      }

      if (eventsData.success) {
        setAllEvents(eventsData.data);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateForm() {
    setEditingStaff(null);
    setFormEmail('');
    setFormPassword('');
    setSelectedEventIds([]);
    setShowForm(true);
  }

  function openEditForm(staff: StaffMember) {
    setEditingStaff(staff);
    setFormEmail(staff.email);
    setFormPassword('');
    setSelectedEventIds(staff.events.map((e) => e.id));
    setShowForm(true);
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  }

  async function handleSubmit() {
    if (!formEmail.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      if (editingStaff) {
        const res = await fetch(`/api/staff/${editingStaff.id}/events`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventIds: selectedEventIds }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to update staff');
          return;
        }
      } else {
        if (!formPassword) {
          setError('Password required for new staff');
          return;
        }
        const res = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail.trim(),
            password: formPassword,
            eventIds: selectedEventIds,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to create staff');
          return;
        }
      }

      setShowForm(false);
      await fetchData();
    } catch {
      setError('Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(staffId: string) {
    if (!confirm('Remove this check-in staff account?')) return;

    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        setError(data.error || 'Failed to delete staff');
      }
    } catch {
      setError('Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h2 text-neutral-text">Check-In Staff Management</h3>
          <p className="text-neutral-muted mt-1 text-small">
            Create staff accounts and assign events for check-in
          </p>
        </div>
        <Button onClick={openCreateForm}>+ New Check-In Staff</Button>
      </div>

      {error && <Alert variant="error" message={error} />}

      {showForm && (
        <Card padding="lg" className="space-y-4 border border-primary/30">
          <h4 className="text-h3 text-neutral-text">
            {editingStaff ? 'Edit Staff' : 'New Check-In Staff'}
          </h4>

          <Input
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            disabled={!!editingStaff}
            placeholder="staff@example.com"
          />

          {!editingStaff && (
            <Input
              label="Password"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="Set password"
            />
          )}

          <div>
            <p className="text-small font-medium uppercase tracking-wide text-neutral-muted mb-3">
              Assign Events
            </p>
            <div className="flex flex-wrap gap-2">
              {allEvents.map((ev) => {
                const selected = selectedEventIds.includes(ev.id);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleEvent(ev.id)}
                    className={`px-3 py-1.5 rounded-full text-small font-medium transition-colors ${
                      selected
                        ? 'bg-primary text-white'
                        : 'bg-surface-hover text-neutral-muted hover:text-neutral-text'
                    }`}
                  >
                    {ev.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} loading={submitting}>
              {editingStaff ? 'Save Changes' : 'Create Staff'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-neutral-muted">Loading staff...</p>
      ) : staffList.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-neutral-muted">No check-in staff yet. Create one above.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h4 className="text-small font-semibold uppercase tracking-wide text-neutral-muted">
            Staff List
          </h4>
          {staffList.map((staff) => (
            <Card key={staff.id} padding="md" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-neutral-text">
                    Name: {staffDisplayName(staff.email)}
                  </p>
                  <p className="text-small text-neutral-muted">Email: {staff.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditForm(staff)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(staff.id)}>
                    Remove
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-small text-neutral-muted">Events:</span>
                {staff.events.length === 0 ? (
                  <span className="text-small text-neutral-muted italic">None assigned</span>
                ) : (
                  staff.events.map((ev) => (
                    <span
                      key={ev.id}
                      className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-small"
                    >
                      {ev.name}
                    </span>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
