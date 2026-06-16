'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

interface AddGuestManualFormProps {
  eventId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddGuestManualForm({
  eventId,
  onSuccess,
  onCancel,
}: AddGuestManualFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    guest_type: 'single' as 'single' | 'double',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Guest name must be at least 2 characters');
      return;
    }

    const email = formData.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    const phone = formData.phone.trim();
    if (!phone) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name: formData.name.trim(),
          email: email || null,
          phone,
          guest_type: formData.guest_type,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add guest');
      }

      setSuccess('Guest added successfully!');
      setFormData({ name: '', email: '', phone: '', guest_type: 'single' });

      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding guest');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Guest Name"
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="John Doe"
        disabled={loading}
        required
      />

      <Input
        label="Guest Email (optional)"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="john@example.com"
        disabled={loading}
      />

      <Input
        label="Guest Phone"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="0767987878 au 255767987878"
        disabled={loading}
        required
      />

      <div className="space-y-2">
        <p className="text-small font-medium uppercase tracking-wide text-neutral-muted">
          Aina ya Mgeni
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="guest_type"
              value="single"
              checked={formData.guest_type === 'single'}
              onChange={() => setFormData({ ...formData, guest_type: 'single' })}
              disabled={loading}
              className="text-primary"
            />
            <span className="text-sm text-neutral-text">Single (mtu 1)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="guest_type"
              value="double"
              checked={formData.guest_type === 'double'}
              onChange={() => setFormData({ ...formData, guest_type: 'double' })}
              disabled={loading}
              className="text-primary"
            />
            <span className="text-sm text-neutral-text">Double (watu 2)</span>
          </label>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {loading ? 'Saving...' : 'Save Guest'}
        </Button>
      </div>
    </form>
  );
}
