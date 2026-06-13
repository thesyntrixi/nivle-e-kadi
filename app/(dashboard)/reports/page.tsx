'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { StatsOverview, StatsData } from '@/components/dashboard/StatsOverview';
import {
  MessageChart,
  MessageStatusItem,
  TimelineItem,
} from '@/components/dashboard/MessageChart';
import { GuestChart, GuestEventItem } from '@/components/dashboard/GuestChart';

type DatePreset = '7d' | '30d' | '90d' | 'all';

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: DatePreset): { from: string; to: string } | null {
  const to = new Date();
  const from = new Date();

  if (preset === 'all') return null;

  if (preset === '7d') from.setDate(to.getDate() - 7);
  else if (preset === '30d') from.setDate(to.getDate() - 30);
  else if (preset === '90d') from.setDate(to.getDate() - 90);

  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-surface-hover rounded" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-hover rounded-card" />
        ))}
      </div>
    </div>
  );
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('from') ?? '';
  const toParam = searchParams.get('to') ?? '';
  const presetParam = (searchParams.get('preset') as DatePreset) ?? 'all';

  const [dateFrom, setDateFrom] = useState(fromParam);
  const [dateTo, setDateTo] = useState(toParam || formatDateInput(new Date()));
  const [activePreset, setActivePreset] = useState<DatePreset>(presetParam);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [messageStatus, setMessageStatus] = useState<MessageStatusItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [guestEvents, setGuestEvents] = useState<GuestEventItem[]>([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [dateFrom, dateTo]);

  const fetchAll = useCallback(async () => {
    setError('');
    setStatsLoading(true);
    setMessagesLoading(true);
    setGuestsLoading(true);

    const qs = buildQuery();

    try {
      const [statsRes, messagesRes, timelineRes, guestsRes] = await Promise.all([
        fetch(`/api/reports/stats${qs}`),
        fetch(`/api/reports/messages${qs}`),
        fetch(`/api/reports/messages${qs}${qs ? '&' : '?'}groupby=day`),
        fetch(`/api/reports/guests${qs}${qs ? '&' : '?'}limit=10`),
      ]);

      const [statsData, messagesData, timelineData, guestsData] = await Promise.all([
        statsRes.json(),
        messagesRes.json(),
        timelineRes.json(),
        guestsRes.json(),
      ]);

      if (!statsData.success) {
        setError(statsData.error || 'Failed to load statistics.');
      } else {
        setStats(statsData.data);
      }

      if (messagesData.success) setMessageStatus(messagesData.data);
      if (timelineData.success) setTimeline(timelineData.data);
      if (guestsData.success) setGuestEvents(guestsData.data);
    } catch (err) {
      console.error('Fetch reports error:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setStatsLoading(false);
      setMessagesLoading(false);
      setGuestsLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function updateUrl(from: string, to: string, preset: DatePreset) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (preset !== 'all') params.set('preset', preset);
    const qs = params.toString();
    router.push(qs ? `/reports?${qs}` : '/reports');
  }

  function applyPreset(preset: DatePreset) {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
      updateUrl(range.from, range.to, preset);
    } else {
      setDateFrom('');
      setDateTo(formatDateInput(new Date()));
      updateUrl('', formatDateInput(new Date()), 'all');
    }
  }

  function handleApplyDates() {
    setActivePreset('all');
    updateUrl(dateFrom, dateTo, 'all');
  }

  function handleResetDates() {
    applyPreset('all');
  }

  function exportCsv() {
    if (!stats) return;

    setExporting(true);

    try {
      const rangeLabel =
        dateFrom && dateTo
          ? `${formatDisplayDate(dateFrom)} - ${formatDisplayDate(dateTo)}`
          : 'All time';

      const lines: string[] = [
        'NIVLE E-Kadi Report',
        `Date Range:,${rangeLabel}`,
        '',
        'STATISTICS',
        `Total Clients,${stats.totalClients}`,
        `Total Events,${stats.totalEvents}`,
        `Total Guests,${stats.totalGuests}`,
        `Messages Sent,${stats.messagesSent}`,
        `Delivery Rate,${stats.deliveryRate}%`,
        `Open Rate,${stats.openRate}%`,
        '',
        'MESSAGES BY STATUS',
        'Status,Count',
        ...messageStatus.map((m) => `${m.status},${m.count}`),
        '',
        'DELIVERY TIMELINE',
        'Date,Sent,Delivered,Opened,Open Rate %',
        ...timeline.map(
          (t) => `${t.date},${t.sent},${t.delivered},${t.opened},${t.openRate}`
        ),
        '',
        'GUESTS BY EVENT',
        'Event Name,Guest Count',
        ...guestEvents.map((g) => `"${g.event_name}",${g.guest_count}`),
      ];

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nivle-e-kadi-report-${dateFrom || 'all'}-${dateTo || 'time'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const presets: { id: DatePreset; label: string }[] = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 3 months' },
    { id: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h1 text-neutral-text">Reports & Analytics</h2>
          <p className="text-neutral-muted mt-1">
            Overview of your NIVLE E-Kadi activity
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          loading={exporting}
          disabled={!stats || statsLoading}
          className="w-full sm:w-auto"
        >
          {exporting ? 'Exporting...' : 'Export Report (CSV)'}
        </Button>
      </div>

      <Card padding="md">
        <h3 className="text-h3 text-neutral-text mb-4">Date Range</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`
                px-4 py-2 rounded-button text-small font-medium transition-all duration-200
                ${activePreset === p.id
                  ? 'bg-primary text-white shadow-glow'
                  : 'bg-surface-hover text-neutral-muted hover:text-neutral-text hover:bg-surface-hover/80'}
              `}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setActivePreset('all');
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setActivePreset('all');
            }}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleApplyDates}>Apply</Button>
          <Button variant="outline" onClick={handleResetDates}>
            Reset
          </Button>
        </div>
      </Card>

      {error && (
        <div className="space-y-3">
          <Alert variant="error" title="Failed to load data" message={error} />
          <Button variant="outline" onClick={fetchAll}>
            Try Again
          </Button>
        </div>
      )}

      <section>
        <h3 className="text-h3 text-neutral-text mb-4">Key Metrics</h3>
        <StatsOverview stats={stats} loading={statsLoading} />
      </section>

      <section>
        <MessageChart
          statusData={messageStatus}
          timelineData={timeline}
          loading={messagesLoading}
        />
      </section>

      <section>
        <GuestChart data={guestEvents} loading={guestsLoading} />
      </section>
    </div>
  );
}
