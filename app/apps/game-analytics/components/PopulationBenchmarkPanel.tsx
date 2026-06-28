'use client';

import { useMemo, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Minus, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Game, AnalyticsSummary } from '../lib/types';
import { getPopulationBenchmarks, PopulationBenchmarkDimension, GamerProfile, GAMER_PROFILES } from '../lib/calculations';
import { useKpiHistory } from '../hooks/useKpiHistory';
import { KpiSnapshot } from '../lib/kpi-history-storage';

interface PopulationBenchmarkPanelProps {
  games: Game[];
  summary: AnalyticsSummary;
  userId?: string;
}

const TREND_KEYS = [
  'costPerHour', 'completionRate', 'backlogSize', 'hoursPerWeek',
  'avgRating', 'genreDiversity', 'yearlySpend', 'firstPlayDays', 'sessionLengthHours',
] as const;
type TrendKey = typeof TREND_KEYS[number];

function isTrendKey(key: string): key is TrendKey {
  return (TREND_KEYS as readonly string[]).includes(key);
}

function buildTrendSeries(history: KpiSnapshot[], key: TrendKey): { date: string; value: number }[] {
  return history
    .filter(h => typeof h[key] === 'number')
    .map(h => ({ date: h.date.slice(5), value: h[key] as number }));
}

function verdictColor(verdict: PopulationBenchmarkDimension['verdict']): string {
  if (verdict === 'ahead') return '#22c55e';
  if (verdict === 'behind') return '#ef4444';
  return '#9ca3af';
}

function VerdictIcon({ verdict }: { verdict: PopulationBenchmarkDimension['verdict'] }) {
  const color = verdictColor(verdict);
  if (verdict === 'ahead') return <TrendingUp size={12} style={{ color }} />;
  if (verdict === 'behind') return <TrendingDown size={12} style={{ color }} />;
  return <Minus size={12} style={{ color }} />;
}

function DimensionTrendChart({ series, unit, color }: { series: { date: string; value: number }[]; unit: string; color: string }) {
  if (series.length < 2) {
    return (
      <p className="text-[10px] text-white/35 italic px-1">
        We&apos;ll plot this dimension&apos;s trend here once a few more days of history build up.
      </p>
    );
  }
  return (
    <div className="h-[100px] -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8 }} width={32} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 1.5 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-2 py-1 text-[10px]">
                    <p className="text-white/70">{label}</p>
                    <p style={{ color }}>{payload[0].value}{unit}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DimensionBar({
  dimension,
  expanded,
  onToggle,
  trendSeries,
}: {
  dimension: PopulationBenchmarkDimension;
  expanded: boolean;
  onToggle: () => void;
  trendSeries: { date: string; value: number }[];
}) {
  const max = Math.max(dimension.you, dimension.average, 0.01) * 1.15;
  const youPct = Math.min(100, (dimension.you / max) * 100);
  const avgPct = Math.min(100, (dimension.average / max) * 100);
  const color = verdictColor(dimension.verdict);

  return (
    <div className="py-2.5 border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-white/70 flex items-center gap-1">
            {dimension.label}
            <ChevronDown
              size={11}
              className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </span>
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color }}>
            <VerdictIcon verdict={dimension.verdict} />
            {dimension.percentDelta > 0 ? '+' : ''}{dimension.percentDelta}%
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/40 w-8 shrink-0">You</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${youPct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] text-white/60 w-14 shrink-0 text-right">
              {dimension.you}{dimension.unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/40 w-8 shrink-0">Avg</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-white/25" style={{ width: `${avgPct}%` }} />
            </div>
            <span className="text-[10px] text-white/35 w-14 shrink-0 text-right">
              {dimension.average}{dimension.unit}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-white/40 mt-1.5 leading-snug">{dimension.insight}</p>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1 text-[9px] text-white/35 uppercase tracking-wider mb-1 px-1">
            <LineChartIcon size={9} />
            Trend over time
          </div>
          <DimensionTrendChart series={trendSeries} unit={dimension.unit} color={color} />
        </div>
      )}
    </div>
  );
}

export function PopulationBenchmarkPanel({ games, summary, userId }: PopulationBenchmarkPanelProps) {
  const [profile, setProfile] = useState<GamerProfile>('average');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const data = useMemo(() => getPopulationBenchmarks(games, summary, profile), [games, summary, profile]);
  const { history } = useKpiHistory(games, userId ?? '');

  const ownedCount = games.filter(g => g.status !== 'Wishlist').length;
  if (ownedCount === 0) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
        <Users size={14} className="text-indigo-400" />
        You vs. The {data.profileLabel}
      </h4>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {GAMER_PROFILES.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => setProfile(p.key)}
            title={p.description}
            className={`shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              profile === p.key
                ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="text-center mb-3 p-3 bg-white/5 rounded-lg">
        <div className="text-2xl font-black text-indigo-400">{data.gamerIndex}</div>
        <div className="text-xs font-medium text-white/70 mt-0.5">{data.gamerIndexLabel}</div>
        <div className="text-[10px] text-white/40 mt-1.5">{data.headline}</div>
        <div className="text-[9px] text-white/30 mt-1 italic">{data.profileDescription}</div>
      </div>

      {(data.strongestDimension || data.weakestDimension) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {data.strongestDimension && (
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-[9px] text-green-400/80 uppercase tracking-wider mb-0.5">Strongest Edge</div>
              <div className="text-xs font-semibold text-white/80">{data.strongestDimension.label}</div>
            </div>
          )}
          {data.weakestDimension && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-[9px] text-red-400/80 uppercase tracking-wider mb-0.5">Biggest Gap</div>
              <div className="text-xs font-semibold text-white/80">{data.weakestDimension.label}</div>
            </div>
          )}
        </div>
      )}

      <div>
        {data.dimensions.map(dimension => (
          <DimensionBar
            key={dimension.key}
            dimension={dimension}
            expanded={expandedKey === dimension.key}
            onToggle={() => setExpandedKey(prev => (prev === dimension.key ? null : dimension.key))}
            trendSeries={isTrendKey(dimension.key) ? buildTrendSeries(history, dimension.key) : []}
          />
        ))}
      </div>

      <p className="text-[9px] text-white/25 mt-3 text-center leading-snug">
        &quot;{data.profileLabel}&quot; figures are general, rounded estimates for fun comparison — not precisely sourced data.
      </p>
    </div>
  );
}
