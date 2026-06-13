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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Valid email is required');
      return;
    }

    const phone = formData.phone.trim();
    if (!phone.startsWith('+')) {
      setError('Phone must start with + (e.g., +255712345678)');
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
          email,
          phone,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add guest');
      }

      setSuccess('Guest added successfully!');
      setFormData({ name: '', email: '', phone: '' });

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
        label="Guest Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="john@example.com"
        disabled={loading}
        required
      />

      <Input
        label="Guest Phone"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="+255712345678"
        disabled={loading}
        required
      />

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
