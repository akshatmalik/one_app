'use client';

import { useMemo, useState } from 'react';
import { LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { useKpiHistory } from '../hooks/useKpiHistory';

interface KpiTrendsPanelProps {
  games: Game[];
  userId: string;
}

type MetricKey = 'creditScore' | 'costPerHour' | 'completionRate' | 'totalHours' | 'librarySize';

const METRICS: { key: MetricKey; label: string; color: string; format: (v: number) => string; lowerIsBetter?: boolean }[] = [
  { key: 'creditScore', label: 'Credit Score', color: '#8b5cf6', format: v => `${Math.round(v)}` },
  { key: 'costPerHour', label: 'Cost/Hour', color: '#10b981', format: v => `$${v.toFixed(2)}`, lowerIsBetter: true },
  { key: 'completionRate', label: 'Completion %', color: '#3b82f6', format: v => `${Math.round(v)}%` },
  { key: 'totalHours', label: 'Total Hours', color: '#f59e0b', format: v => `${Math.round(v)}h` },
  { key: 'librarySize', label: 'Library Size', color: '#ec4899', format: v => `${Math.round(v)}` },
];

type RangeKey = '30d' | '90d' | 'all';
const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

export function KpiTrendsPanel({ games, userId }: KpiTrendsPanelProps) {
  const { history } = useKpiHistory(games, userId);
  const [metric, setMetric] = useState<MetricKey>('creditScore');
  const [range, setRange] = useState<RangeKey>('30d');

  const activeMetric = METRICS.find(m => m.key === metric)!;
  const activeRange = RANGES.find(r => r.key === range)!;

  const filtered = useMemo(() => {
    if (activeRange.days === null) return history;
    const cutoff = Date.now() - activeRange.days * 24 * 60 * 60 * 1000;
    return history.filter(h => new Date(`${h.date}T00:00:00`).getTime() >= cutoff);
  }, [history, activeRange]);

  const chartData = useMemo(
    () => filtered.map(h => ({ date: h.date.slice(5), value: h[metric] })),
    [filtered, metric]
  );

  const trend = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0][metric];
    const last = filtered[filtered.length - 1][metric];
    const delta = last - first;
    if (Math.abs(delta) < 0.01) return { delta: 0, direction: 'stable' as const };
    const isImprovement = activeMetric.lowerIsBetter ? delta < 0 : delta > 0;
    return { delta, direction: isImprovement ? ('up' as const) : ('down' as const) };
  }, [filtered, metric, activeMetric]);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return null;

  if (history.length < 2) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <LineChartIcon size={14} className="text-violet-400" />
          Stats History
        </h3>
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center">
          <p className="text-xs text-white/40">
            We&apos;re tracking your stats over time — check back in a few days to see your trend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <LineChartIcon size={14} className="text-violet-400" />
        Stats History
      </h3>

      <div className="p-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex gap-1 flex-wrap">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={clsx(
                  'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                  metric === m.key ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={clsx(
                  'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                  range === r.key ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {trend && (
          <div className="text-center mb-3">
            <div
              className={clsx('text-xs font-medium flex items-center justify-center gap-1', {
                'text-emerald-400': trend.direction === 'up',
                'text-red-400': trend.direction === 'down',
                'text-white/40': trend.direction === 'stable',
              })}
            >
              {trend.direction === 'up' && <TrendingUp size={12} />}
              {trend.direction === 'down' && <TrendingDown size={12} />}
              {trend.direction === 'stable' && <Minus size={12} />}
              {trend.direction === 'stable'
                ? `${activeMetric.label} has been steady over the last ${activeRange.label === 'All' ? 'tracked period' : activeRange.label}`
                : `${activeMetric.label} ${trend.delta > 0 ? 'rose' : 'changed'} from ${activeMetric.format(filtered[0][metric])} to ${activeMetric.format(filtered[filtered.length - 1][metric])} over the last ${activeRange.label === 'All' ? 'tracked period' : activeRange.label}`}
            </div>
          </div>
        )}

        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickFormatter={v => activeMetric.format(v)} width={48} />
              <Line type="monotone" dataKey="value" stroke={activeMetric.color} strokeWidth={2} dot={{ r: 2 }} name={activeMetric.label} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                        <p className="text-white/90 font-medium mb-1">{label}</p>
                        <p style={{ color: activeMetric.color }}>
                          {activeMetric.label}: {activeMetric.format(Number(payload[0].value))}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
