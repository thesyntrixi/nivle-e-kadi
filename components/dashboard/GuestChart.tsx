'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';

export interface GuestEventItem {
  event_id: string;
  event_name: string;
  guest_count: number;
}

interface GuestChartProps {
  data: GuestEventItem[];
  loading?: boolean;
}

function truncateName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export function GuestChart({ data, loading = false }: GuestChartProps) {
  const totalGuests = data.reduce((sum, d) => sum + d.guest_count, 0);

  const chartData = data.map((d) => ({
    ...d,
    shortName: truncateName(d.event_name),
  }));

  if (loading) {
    return (
      <Card padding="md">
        <div className="animate-pulse bg-surface-hover rounded-card h-80" />
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3 text-neutral-text">Guests by Event</h3>
        {data.length > 0 && (
          <p className="text-small text-neutral-muted">
            Total: <span className="text-neutral-text font-semibold">{totalGuests}</span> guests
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-neutral-muted text-center py-16">
          No guest data available for selected date range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(chartData.length * 80, 300) }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#8B949E', fontSize: 12 }}
                  axisLine={{ stroke: '#30363D' }}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={120}
                  tick={{ fill: '#8B949E', fontSize: 11 }}
                  axisLine={{ stroke: '#30363D' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    color: '#C9D1D9',
                  }}
                  formatter={(value) => [value ?? 0, 'Guests']}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as GuestEventItem | undefined)?.event_name ?? ''
                  }
                />
                <Bar dataKey="guest_count" name="Guests" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={`hsl(${210 + index * 8}, 100%, ${45 + index * 2}%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
