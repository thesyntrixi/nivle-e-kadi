'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export function ProfileSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setName(data.data.name || '');
          setEmail(data.data.email || '');
          setPhone(data.data.phone || '');
        } else {
          setError(data.error || 'Failed to load profile');
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setName(data.data.name || '');
      setEmail(data.data.email || '');
      setPhone(data.data.phone || '');
      setSuccess(data.message || 'Profile updated successfully');
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-neutral-muted">Loading profile...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h2 text-neutral-text">Profile</h3>
        <p className="text-neutral-muted mt-1 text-small">Update your account information</p>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <Input
            label="Jina kamili (Full name)"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weka jina lako kamili"
            disabled={saving}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Weka barua pepe yako"
            required
            disabled={saving}
          />

          <Input
            label="Namba ya simu (Phone number)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Weka namba ya simu"
            disabled={saving}
          />

          <Button type="submit" loading={saving}>
            Save Profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
