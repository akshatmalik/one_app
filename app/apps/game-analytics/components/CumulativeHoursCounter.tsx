'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Game } from '../lib/types';
import {
  getCumulativeHoursCounter,
  HoursCounterResolution,
  HoursCounterPoint,
} from '../lib/calculations';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Gamepad2,
  Trophy,
} from 'lucide-react';

interface CumulativeHoursCounterProps {
  games: Game[];
  className?: string;
}

const RESOLUTION_LABELS: Record<HoursCounterResolution, string> = {
  daily: 'Daily',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function CumulativeHoursCounter({ games, className }: CumulativeHoursCounterProps) {
  const now = new Date();
  const [resolution, setResolution] = useState<HoursCounterResolution>('daily');
  const [scopeMonth, setScopeMonth] = useState(now.getMonth());
  const [scopeYear, setScopeYear] = useState(now.getFullYear());
  const [showCumulative, setShowCumulative] = useState(true);

  const data = useMemo(() => {
    if (resolution === 'daily') {
      return getCumulativeHoursCounter(games, 'daily', scopeMonth, scopeYear);
    } else if (resolution === 'monthly') {
      return getCumulativeHoursCounter(games, 'monthly', scopeYear);
    } else {
      return getCumulativeHoursCounter(games, 'yearly');
    }
  }, [games, resolution, scopeMonth, scopeYear]);

  const chartData = useMemo(() =>
    data.points.map(p => ({
      label: resolution === 'daily' ? p.label.split(' ')[1] : // Just day number
             resolution === 'monthly' ? p.label.split(' ')[0] : // Just month abbr
             p.label,
      hours: p.hours,
      cumulative: p.cumulative,
      sessions: p.sessions,
      gamesPlayed: p.gamesPlayed,
      topGame: p.topGame,
      topGameHours: p.topGameHours,
      fullLabel: p.label,
    })),
    [data.points, resolution]
  );

  // Navigation
  const canGoBack = resolution === 'daily' || resolution === 'monthly';
  const canGoForward = resolution === 'daily'
    ? !(scopeYear === now.getFullYear() && scopeMonth === now.getMonth())
    : resolution === 'monthly'
    ? scopeYear < now.getFullYear()
    : false;

  const goBack = () => {
    if (resolution === 'daily') {
      if (scopeMonth === 0) { setScopeMonth(11); setScopeYear(y => y - 1); }
      else setScopeMonth(m => m - 1);
    } else if (resolution === 'monthly') {
      setScopeYear(y => y - 1);
    }
  };

  const goForward = () => {
    if (resolution === 'daily') {
      if (scopeMonth === 11) { setScopeMonth(0); setScopeYear(y => y + 1); }
      else setScopeMonth(m => m + 1);
    } else if (resolution === 'monthly') {
      setScopeYear(y => y + 1);
    }
  };

  const TrendIcon = data.trend > 0 ? TrendingUp : data.trend < 0 ? TrendingDown : Minus;
  const trendColor = data.trend > 0 ? 'text-green-400' : data.trend < 0 ? 'text-red-400' : 'text-white/40';

  return (
    <div className={clsx('bg-white/[0.02] rounded-xl border border-white/[0.06]', className)}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Hours Counter</h3>
          </div>

          {/* Resolution Toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            {(['daily', 'monthly', 'yearly'] as HoursCounterResolution[]).map(r => (
              <button
                key={r}
                onClick={() => {
                  setResolution(r);
                  if (r === 'daily') { setScopeMonth(now.getMonth()); setScopeYear(now.getFullYear()); }
                  if (r === 'monthly') setScopeYear(now.getFullYear());
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-[10px] font-medium transition-all',
                  resolution === r
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-white/30 hover:text-white/60'
                )}
              >
                {RESOLUTION_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button onClick={goBack} className="p-1 rounded text-white/30 hover:text-white/60 transition-colors">
                <ChevronLeft size={14} />
              </button>
            )}
            <span className="text-xs font-medium text-white/70">{data.periodLabel}</span>
            {canGoForward && (
              <button onClick={goForward} className="p-1 rounded text-white/30 hover:text-white/60 transition-colors">
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Cumulative / Per-period toggle */}
          <button
            onClick={() => setShowCumulative(!showCumulative)}
            className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full border transition-all',
              showCumulative
                ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                : 'border-white/10 text-white/40 hover:text-white/60'
            )}
          >
            {showCumulative ? 'Cumulative' : 'Per Period'}
          </button>
        </div>

        {/* Hero Numbers */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white tabular-nums">
              {showCumulative ? data.currentPeriodTotal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : data.currentPeriodTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">
              {resolution === 'daily' ? 'Month Hrs' : resolution === 'monthly' ? 'Year Hrs' : 'Total Hrs'}
            </div>
          </div>

          <div className="text-center">
            <div className={clsx('text-lg font-bold tabular-nums flex items-center justify-center gap-1', trendColor)}>
              <TrendIcon size={12} />
              {Math.abs(data.trend)}%
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">vs Prev</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-white tabular-nums">
              {data.avgPerPeriod.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">
              Avg/{resolution === 'daily' ? 'Day' : resolution === 'monthly' ? 'Mo' : 'Yr'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-orange-400 tabular-nums flex items-center justify-center gap-1">
              {data.currentStreak > 0 && <Flame size={12} />}
              {data.currentStreak}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Streak</div>
          </div>
        </div>

        {/* All-time running total */}
        <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] mb-2">
          <Trophy size={10} className="text-yellow-400/60" />
          <span className="text-[10px] text-white/40">All-time:</span>
          <span className="text-xs font-bold text-white tabular-nums">
            {data.allTimeTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={180}>
          {showCumulative ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                interval={resolution === 'daily' ? Math.max(0, Math.floor(chartData.length / 8) - 1) : 0}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip content={<CounterTooltip showCumulative />} />
              {data.avgPerPeriod > 0 && (
                <ReferenceLine
                  y={data.avgPerPeriod * chartData.length}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  label={{ value: 'Avg pace', position: 'right', fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#cumulativeGrad)"
                animationDuration={1200}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                interval={resolution === 'daily' ? Math.max(0, Math.floor(chartData.length / 8) - 1) : 0}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip content={<CounterTooltip showCumulative={false} />} />
              {data.avgPerPeriod > 0 && (
                <ReferenceLine
                  y={data.avgPerPeriod}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  label={{ value: 'Avg', position: 'right', fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                />
              )}
              <Bar
                dataKey="hours"
                fill="#06b6d4"
                radius={[3, 3, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Best Period + Top Game */}
      {data.bestPeriod && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1 text-white/30">
              <Trophy size={10} className="text-yellow-400/60" />
              Best: <span className="text-white/60 font-medium">{data.bestPeriod.label}</span>
              <span className="text-cyan-400/60">({data.bestPeriod.hours}h)</span>
            </div>
            {data.bestPeriod.topGame && (
              <div className="flex items-center gap-1 text-white/30">
                <Gamepad2 size={10} className="text-purple-400/60" />
                <span className="text-white/60">{data.bestPeriod.topGame}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom tooltip
interface CounterTooltipPayload {
  fullLabel: string;
  hours: number;
  cumulative: number;
  sessions: number;
  topGame?: string;
  topGameHours?: number;
}

function CounterTooltip({ active, payload, showCumulative }: {
  active?: boolean;
  payload?: Array<{ payload: CounterTooltipPayload }>;
  showCumulative: boolean;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-white mb-1">{d.fullLabel}</div>
      <div className="space-y-0.5">
        <div className="text-white/60">
          Hours: <span className="text-cyan-400 font-medium">{d.hours.toFixed(1)}h</span>
        </div>
        {showCumulative && (
          <div className="text-white/60">
            Running total: <span className="text-white font-medium">{d.cumulative.toFixed(1)}h</span>
          </div>
        )}
        {d.sessions > 0 && (
          <div className="text-white/60">
            Sessions: <span className="text-white/80">{d.sessions}</span>
          </div>
        )}
        {d.topGame && (
          <div className="text-white/60">
            Top: <span className="text-purple-400">{d.topGame}</span>
            {d.topGameHours != null && <span className="text-white/40"> ({d.topGameHours.toFixed(1)}h)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
