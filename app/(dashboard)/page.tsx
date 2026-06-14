'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { MessageWithGuest } from '@/app/api/messages/route';
import { Client, Event } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { StatCard } from '@/components/dashboard/StatCard';

type StatsData = {
  totalClients: number;
  totalEvents: number;
  totalGuests: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesOpened: number;
  deliveryRate: number;
  openRate: number;
  trends: {
    messagesSent: { change: number; direction: 'up' | 'down' | 'neutral' };
    deliveryRate: { change: number; direction: 'up' | 'down' | 'neutral' };
    openRate: { change: number; direction: 'up' | 'down' | 'neutral' };
  };
};

type ActivityItem = {
  id: string;
  icon: string;
  description: string;
  timestamp: Date;
  href?: string;
};

type CardItem = { id: string; created_at: Date; event_name: string; original_file_name: string };

function formatTrend(trend: { change: number; direction: 'up' | 'down' | 'neutral' }): string {
  if (trend.direction === 'neutral') return 'No change vs last 30 days';
  const arrow = trend.direction === 'up' ? '↑' : '↓';
  const label = trend.direction === 'up' ? 'improving' : 'declining';
  return `${arrow} ${Math.abs(trend.change)}% · ${label}`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildActivity(
  messages: MessageWithGuest[],
  events: Event[],
  cards: CardItem[],
  clients: Client[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  const recentWa = messages.filter((m) => m.message_type === 'WhatsApp').length;
  const recentSms = messages.filter((m) => m.message_type === 'SMS').length;

  if (recentWa > 0) {
    const latest = messages.find((m) => m.message_type === 'WhatsApp');
    items.push({
      id: 'wa-batch',
      icon: '💬',
      description: `${recentWa} WhatsApp message${recentWa === 1 ? '' : 's'} sent`,
      timestamp: new Date(latest?.created_at ?? Date.now()),
      href: '/messages',
    });
  }

  if (recentSms >= 5) {
    const latest = messages.find((m) => m.message_type === 'SMS');
    items.push({
      id: 'sms-batch',
      icon: '📱',
      description: `SMS sent to ${recentSms} guests`,
      timestamp: new Date(latest?.created_at ?? Date.now()),
      href: '/messages',
    });
  }

  for (const event of events.slice(0, 3)) {
    items.push({
      id: `event-${event.id}`,
      icon: '📅',
      description: `Event "${event.name}" created`,
      timestamp: new Date(event.created_at),
      href: `/events/${event.id}`,
    });

    if (event.guest_count > 0) {
      items.push({
        id: `guests-${event.id}`,
        icon: '👥',
        description: `${event.guest_count} guests in "${event.name}"`,
        timestamp: new Date(event.updated_at),
        href: `/guests?event_id=${event.id}`,
      });
    }
  }

  for (const card of cards.slice(0, 2)) {
    items.push({
      id: `card-${card.id}`,
      icon: '🎨',
      description: `Card template uploaded for ${card.event_name}`,
      timestamp: new Date(card.created_at),
      href: '/cards',
    });
  }

  for (const client of clients.slice(0, 2)) {
    items.push({
      id: `client-${client.id}`,
      icon: '🏢',
      description: `Client "${client.name}" added`,
      timestamp: new Date(client.created_at),
      href: `/clients/${client.id}`,
    });
  }

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}

function SkeletonCard() {
  return (
    <Card padding="md" className="animate-pulse">
      <div className="h-4 w-24 bg-surface-hover rounded mb-4" />
      <div className="h-8 w-16 bg-surface-hover rounded mb-2" />
      <div className="h-3 w-32 bg-surface-hover rounded" />
    </Card>
  );
}

interface QuickAccessCardProps {
  title: string;
  count: number | string;
  description: string;
  href: string;
  buttonLabel: string;
  icon: string;
  accent: string;
  loading?: boolean;
}

function QuickAccessCard({
  title,
  count,
  description,
  href,
  buttonLabel,
  icon,
  accent,
  loading,
}: QuickAccessCardProps) {
  if (loading) return <SkeletonCard />;

  return (
    <Link href={href} className="block group">
      <Card hover className="h-full transition-transform duration-200 group-hover:scale-[1.02]">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`h-11 w-11 rounded-card flex items-center justify-center text-xl ${accent}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>
        <p className="text-small text-neutral-muted font-medium uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-neutral-text mt-1">{count}</p>
        <p className="text-small text-neutral-muted mt-2">{description}</p>
        <span className="inline-block mt-4 text-small font-medium text-primary group-hover:underline">
          {buttonLabel} →
        </span>
      </Card>
    </Link>
  );
}

export default function DashboardHome() {
  const [messages, setMessages] = useState<MessageWithGuest[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [cardCount, setCardCount] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activity = useMemo(
    () => buildActivity(messages, events, cards, clients),
    [messages, events, cards, clients]
  );

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [messagesRes, statsRes, cardsRes, eventsRes, clientsRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/reports/stats'),
        fetch('/api/cards'),
        fetch('/api/events'),
        fetch('/api/clients'),
      ]);

      const [messagesData, statsData, cardsData, eventsData, clientsData] =
        await Promise.all([
          messagesRes.json(),
          statsRes.json(),
          cardsRes.json(),
          eventsRes.json(),
          clientsRes.json(),
        ]);

      if (messagesData.success) setMessages(messagesData.data);
      if (statsData.success) setStats(statsData.data);
      if (cardsData.success) {
        setCards(cardsData.data);
        setCardCount(cardsData.data.length);
      }
      if (eventsData.success) setEvents(eventsData.data);
      if (clientsData.success) setClients(clientsData.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8 animate-fade-in">
      {error && <Alert variant="error" message={error} />}

      <section>
        <div className="mb-4">
          <h3 className="text-h2 text-neutral-text">Quick Access</h3>
          <p className="text-small text-neutral-muted mt-0.5">
            Jump to your core features
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          <QuickAccessCard
            title="Clients"
            count={stats?.totalClients ?? '—'}
            description="Manage your clients"
            href="/clients"
            buttonLabel="View Clients"
            icon="👥"
            accent="bg-primary/15 text-primary"
            loading={loading}
          />
          <QuickAccessCard
            title="Events"
            count={stats?.totalEvents ?? '—'}
            description="Manage events"
            href="/events/new"
            buttonLabel="Create Event"
            icon="📅"
            accent="bg-purple-500/15 text-purple-400"
            loading={loading}
          />
          <QuickAccessCard
            title="Cards"
            count={cardCount}
            description="Invitation designs"
            href="/cards"
            buttonLabel="View Cards"
            icon="🎨"
            accent="bg-accent-success/15 text-accent-success"
            loading={loading}
          />
          <QuickAccessCard
            title="Guests"
            count={stats?.totalGuests ?? '—'}
            description="Manage guest lists"
            href="/guests"
            buttonLabel="View Guests"
            icon="🎫"
            accent="bg-accent-warning/15 text-accent-warning"
            loading={loading}
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-h2 text-neutral-text">Key Metrics</h3>
          <p className="text-small text-neutral-muted mt-0.5">Last 30 days performance</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                title="Messages Sent"
                value={stats?.messagesSent ?? 0}
                icon="📱"
                trend={stats ? formatTrend(stats.trends.messagesSent) : undefined}
                progress={Math.min((stats?.messagesSent ?? 0) > 0 ? 75 : 0, 100)}
                color="primary"
              />
              <StatCard
                title="Delivery Rate"
                value={`${stats?.deliveryRate ?? 0}%`}
                icon="✅"
                trend={stats ? formatTrend(stats.trends.deliveryRate) : undefined}
                progress={stats?.deliveryRate ?? 0}
                color="success"
              />
              <StatCard
                title="Open Rate"
                value={`${stats?.openRate ?? 0}%`}
                icon="👁️"
                trend={stats ? formatTrend(stats.trends.openRate) : undefined}
                progress={stats?.openRate ?? 0}
                color="info"
              />
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-h2 text-neutral-text">Recent Activity</h3>
          <p className="text-small text-neutral-muted mt-0.5">Latest actions across your account</p>
        </div>
        <Card padding="md">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-hover shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-surface-hover rounded" />
                    <div className="h-2 w-20 bg-surface-hover rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-center text-neutral-muted text-small py-8">
              No recent activity yet. Create a client and event to get started.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-border/50">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center gap-4 py-3.5 hover:bg-surface-hover/40 -mx-2 px-2 rounded-input transition-colors"
                    >
                      <span className="text-xl shrink-0" aria-hidden="true">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-text">{item.description}</p>
                        <p className="text-small text-neutral-muted mt-0.5">
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                      <span className="text-neutral-muted text-small shrink-0">→</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 py-3.5">
                      <span className="text-xl shrink-0" aria-hidden="true">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-text">{item.description}</p>
                        <p className="text-small text-neutral-muted mt-0.5">
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
