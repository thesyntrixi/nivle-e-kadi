'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { StaffManagementSection } from '@/components/settings/StaffManagementSection';

type SettingsTab = 'profile' | 'security' | 'staff';

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'staff', label: 'Staff Management' },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useMemo<SettingsTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'security' || tab === 'staff') return tab;
    return 'profile';
  }, [searchParams]);

  function setTab(tab: SettingsTab) {
    router.replace(tab === 'profile' ? '/settings' : `/settings?tab=${tab}`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-h1 text-neutral-text">Settings</h2>
        <p className="text-neutral-muted mt-1">Manage your account, security, and staff</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 rounded-button text-small font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-surface-hover text-neutral-muted hover:text-neutral-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileSection />}
      {activeTab === 'security' && <SecuritySection />}
      {activeTab === 'staff' && <StaffManagementSection />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-neutral-muted">Loading settings...</p>}>
      <SettingsContent />
    </Suspense>
  );
}
