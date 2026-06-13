'use client';

import { Card } from '@/components/ui/Card';

export interface StatsData {
  totalClients: number;
  totalEvents: number;
  totalGuests: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesOpened: number;
  deliveryRate: number;
  openRate: number;
  trends?: {
    totalClients: TrendInfo;
    totalEvents: TrendInfo;
    totalGuests: TrendInfo;
    messagesSent: TrendInfo;
    deliveryRate: TrendInfo;
    openRate: TrendInfo;
  };
}

interface TrendInfo {
  change: number;
  direction: 'up' | 'down' | 'neutral';
}

interface StatsOverviewProps {
  stats: StatsData | null;
  loading?: boolean;
}

const statCards = [
  { key: 'totalClients' as const, label: 'Total Clients', icon: '👥', format: (v: number) => String(v) },
  { key: 'totalEvents' as const, label: 'Total Events', icon: '📅', format: (v: number) => String(v) },
  { key: 'totalGuests' as const, label: 'Total Guests', icon: '🎫', format: (v: number) => String(v) },
  { key: 'messagesSent' as const, label: 'Messages Sent', icon: '📱', format: (v: number) => String(v) },
  { key: 'deliveryRate' as const, label: 'Delivery Rate', icon: '✅', format: (v: number) => `${v}%` },
  { key: 'openRate' as const, label: 'Open Rate', icon: '👁️', format: (v: number) => `${v}%` },
];

function TrendBadge({ trend }: { trend?: TrendInfo }) {
  if (!trend) return null;

  const styles = {
    up: 'text-accent-success',
    down: 'text-accent-error',
    neutral: 'text-neutral-muted',
  };
  const arrows = { up: '↑', down: '↓', neutral: '→' };

  return (
    <span className={`text-small font-medium ${styles[trend.direction]}`}>
      {arrows[trend.direction]} {Math.abs(trend.change)}%
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card padding="md" className="animate-pulse">
      <div className="h-4 w-24 bg-surface-hover rounded mb-4" />
      <div className="h-8 w-16 bg-surface-hover rounded mb-2" />
      <div className="h-3 w-12 bg-surface-hover rounded" />
    </Card>
  );
}

export function StatsOverview({ stats, loading = false }: StatsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((card) => {
        const value = stats[card.key];
        const trend = stats.trends?.[card.key];

        return (
          <Card
            key={card.key}
            hover
            padding="md"
            className="bg-gradient-to-br from-surface-card to-surface-hover/30 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-small text-neutral-muted font-medium uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-neutral-text mt-2">
                  {card.format(value)}
                </p>
                <div className="mt-2">
                  <TrendBadge trend={trend} />
                </div>
              </div>
              <span className="text-2xl" aria-hidden="true">{card.icon}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
