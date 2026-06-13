'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#6B7280',
  Sent: '#0066FF',
  Delivered: '#238636',
  Opened: '#00D4FF',
  Failed: '#DA3633',
};

export interface MessageStatusItem {
  status: string;
  count: number;
}

export interface TimelineItem {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  openRate: number;
}

interface MessageChartProps {
  statusData: MessageStatusItem[];
  timelineData?: TimelineItem[];
  loading?: boolean;
}

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-surface-hover rounded-card"
      style={{ height }}
    />
  );
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessageChart({
  statusData,
  timelineData = [],
  loading = false,
}: MessageChartProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card padding="md">
          <ChartSkeleton />
        </Card>
        <Card padding="md">
          <ChartSkeleton />
        </Card>
      </div>
    );
  }

  const hasStatus = statusData.length > 0;
  const hasTimeline = timelineData.length > 0;

  return (
    <div className="space-y-6">
      <Card padding="md">
        <h3 className="text-h3 text-neutral-text mb-4">Messages by Status</h3>
        {!hasStatus ? (
          <p className="text-neutral-muted text-center py-16">
            No message data available for selected date range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={statusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis
                dataKey="status"
                tick={{ fill: '#8B949E', fontSize: 12 }}
                axisLine={{ stroke: '#30363D' }}
              />
              <YAxis
                tick={{ fill: '#8B949E', fontSize: 12 }}
                axisLine={{ stroke: '#30363D' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                  color: '#C9D1D9',
                }}
              />
              <Legend wrapperStyle={{ color: '#8B949E' }} />
              <Bar dataKey="count" name="Messages" radius={[6, 6, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? '#6B7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card padding="md">
        <h3 className="text-h3 text-neutral-text mb-4">Delivery Performance Timeline</h3>
        {!hasTimeline ? (
          <p className="text-neutral-muted text-center py-16">
            No timeline data available for selected date range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={timelineData.map((d) => ({
                ...d,
                label: formatDateLabel(d.date),
              }))}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8B949E', fontSize: 11 }}
                axisLine={{ stroke: '#30363D' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#8B949E', fontSize: 12 }}
                axisLine={{ stroke: '#30363D' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#8B949E', fontSize: 12 }}
                axisLine={{ stroke: '#30363D' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                  color: '#C9D1D9',
                }}
              />
              <Legend wrapperStyle={{ color: '#8B949E' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#0066FF"
                strokeWidth={2}
                dot={{ fill: '#0066FF', r: 3 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke="#238636"
                strokeWidth={2}
                dot={{ fill: '#238636', r: 3 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke="#00D4FF"
                strokeWidth={2}
                dot={{ fill: '#00D4FF', r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="openRate"
                name="Open Rate %"
                stroke="#9E6A03"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9E6A03', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
