'use client';

import { useMemo } from 'react';
import { TrendingDown, Zap, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import { Game } from '../lib/types';
import { getValueOverTime, getTotalHours } from '../lib/calculations';
import clsx from 'clsx';

interface ValueJourneyChartProps {
  game: Game;
}

const TIERS = [
  { label: 'Excellent', threshold: 1,  color: '#10b981', textColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Good',      threshold: 3,  color: '#3b82f6', textColor: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  { label: 'Fair',      threshold: 5,  color: '#eab308', textColor: 'text-yellow-400',  bg: 'bg-yellow-500/10'  },
] as const;

function tierForCPH(cph: number): typeof TIERS[number] | null {
  return TIERS.find(t => cph <= t.threshold) ?? null;
}

// Custom tooltip for recharts
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { hrs: number } }[] }) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  const hrs: number = payload[0].payload.hrs;
  const tier = tierForCPH(val);
  return (
    <div className="px-2 py-1.5 rounded-lg bg-gray-900 border border-white/10 text-[10px] shadow-xl">
      <div className="text-white/40">{hrs}h played</div>
      <div className={clsx('font-bold', tier?.textColor ?? 'text-white/70')}>
        ${val.toFixed(2)}/hr {tier ? `· ${tier.label}` : ''}
      </div>
    </div>
  );
}

export function ValueJourneyChart({ game }: ValueJourneyChartProps) {
  const points = useMemo(() => getValueOverTime(game), [game]);
  const totalHours = getTotalHours(game);

  // Need a price and at least 2 data points to be meaningful
  if (game.price <= 0 || points.length < 2) return null;

  const currentCPH = points[points.length - 1].costPerHour;
  const startingCPH = points[0].costPerHour;

  // Cap the y-axis so an expensive game doesn't make the chart unreadable
  const yMax = Math.min(Math.ceil(startingCPH * 1.05 / 5) * 5, 50);

  // Build chart data, clamping values to yMax so the line doesn't shoot off-screen
  const chartData = points.map(p => ({
    hrs: Math.round(p.cumulativeHours * 10) / 10,
    cph: parseFloat(Math.min(p.costPerHour, yMax).toFixed(2)),
  }));

  // Find when the game crossed each tier (first point at or below threshold)
  const crossings: { tier: typeof TIERS[number]; hrs: number }[] = [];
  for (const tier of TIERS) {
    const cross = points.find(p => p.costPerHour <= tier.threshold);
    if (cross) crossings.push({ tier, hrs: Math.round(cross.cumulativeHours * 10) / 10 });
  }

  // Next tier prediction
  const nextTier = TIERS.find(t => currentCPH > t.threshold);
  const hoursToNextTier = nextTier
    ? Math.max(0, Math.ceil((game.price / nextTier.threshold) - totalHours))
    : null;

  // Has the game already "finished the race" (reached Excellent)?
  const isExcellent = currentCPH <= 1;

  // Improvement percentage
  const improvement = startingCPH > 0
    ? Math.round(((startingCPH - currentCPH) / startingCPH) * 100)
    : 0;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={14} className="text-emerald-400 shrink-0" />
        <span className="text-sm font-medium text-white/70">Value Journey</span>
        <span className="ml-auto text-[10px] text-white/30">$/hr over {points.length} sessions</span>
      </div>

      {/* Chart */}
      <div className="h-36 rounded-xl bg-white/[0.02] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`vj-grad-${game.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}  />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="hrs"
              tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }}
              tickFormatter={v => `${v}h`}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }}
              tickFormatter={v => `$${v}`}
              axisLine={false}
              tickLine={false}
              width={28}
              domain={[0, yMax]}
              allowDataOverflow
            />

            {/* Tier reference lines */}
            <ReferenceLine y={1} stroke="#10b981" strokeDasharray="3 2" strokeOpacity={0.45} />
            <ReferenceLine y={3} stroke="#3b82f6" strokeDasharray="3 2" strokeOpacity={0.45} />
            <ReferenceLine y={5} stroke="#eab308" strokeDasharray="3 2" strokeOpacity={0.35} />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="cph"
              stroke="#10b981"
              strokeWidth={2}
              fill={`url(#vj-grad-${game.id})`}
              dot={false}
              activeDot={{ r: 3, fill: '#10b981', stroke: 'transparent' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tier legend */}
      <div className="flex items-center gap-3 mt-1.5 px-1">
        {TIERS.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <div className="w-3 h-px" style={{ background: t.color, opacity: 0.7 }} />
            <span className="text-[9px] text-white/25">${t.threshold} {t.label}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-stretch gap-2 mt-3">
        {/* Start vs now */}
        <div className="flex-1 bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-white/30 mb-0.5">Started at</div>
          <div className="text-xs font-bold text-white/50">${startingCPH.toFixed(2)}/hr</div>
        </div>
        <div className="flex-1 bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-white/30 mb-0.5">Now</div>
          <div className={clsx('text-xs font-bold', tierForCPH(currentCPH)?.textColor ?? 'text-white/50')}>
            ${currentCPH.toFixed(2)}/hr
          </div>
        </div>
        {improvement > 5 && (
          <div className="flex-1 bg-emerald-500/10 rounded-lg px-2.5 py-2 text-center">
            <div className="text-[10px] text-white/30 mb-0.5">Improved</div>
            <div className="text-xs font-bold text-emerald-400">{improvement}%</div>
          </div>
        )}
      </div>

      {/* Tier crossings */}
      {crossings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {crossings.map(({ tier, hrs }) => (
            <span
              key={tier.label}
              className={clsx('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium', tier.bg, tier.textColor)}
            >
              <CheckCircle2 size={9} />
              {tier.label} at {hrs}h
            </span>
          ))}
        </div>
      )}

      {/* Next milestone / congrats */}
      {isExcellent ? (
        <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-300 font-medium">
            Excellent value achieved — every extra hour is pure bonus
          </span>
        </div>
      ) : hoursToNextTier !== null && nextTier && hoursToNextTier <= 100 ? (
        <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/5">
          <Zap size={12} className={clsx('shrink-0', nextTier.textColor)} />
          <span className="text-xs text-white/60">
            <span className={clsx('font-semibold', nextTier.textColor)}>
              {hoursToNextTier} more hour{hoursToNextTier !== 1 ? 's' : ''}
            </span>
            {' '}to reach{' '}
            <span className={nextTier.textColor}>{nextTier.label} Value</span>
            {' '}(${nextTier.threshold}/hr)
          </span>
        </div>
      ) : null}
    </div>
  );
}
