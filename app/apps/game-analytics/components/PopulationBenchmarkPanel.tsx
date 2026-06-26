'use client';

import { useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Game, AnalyticsSummary } from '../lib/types';
import { getPopulationBenchmarks, PopulationBenchmarkDimension } from '../lib/calculations';

interface PopulationBenchmarkPanelProps {
  games: Game[];
  summary: AnalyticsSummary;
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

function DimensionBar({ dimension }: { dimension: PopulationBenchmarkDimension }) {
  const max = Math.max(dimension.you, dimension.average, 0.01) * 1.15;
  const youPct = Math.min(100, (dimension.you / max) * 100);
  const avgPct = Math.min(100, (dimension.average / max) * 100);
  const color = verdictColor(dimension.verdict);

  return (
    <div className="py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/70">{dimension.label}</span>
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
    </div>
  );
}

export function PopulationBenchmarkPanel({ games, summary }: PopulationBenchmarkPanelProps) {
  const data = useMemo(() => getPopulationBenchmarks(games, summary), [games, summary]);

  const ownedCount = games.filter(g => g.status !== 'Wishlist').length;
  if (ownedCount === 0) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
        <Users size={14} className="text-indigo-400" />
        You vs. The Average Gamer
      </h4>

      <div className="text-center mb-3 p-3 bg-white/5 rounded-lg">
        <div className="text-2xl font-black text-indigo-400">{data.gamerIndex}</div>
        <div className="text-xs font-medium text-white/70 mt-0.5">{data.gamerIndexLabel}</div>
        <div className="text-[10px] text-white/40 mt-1.5">{data.headline}</div>
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
          <DimensionBar key={dimension.key} dimension={dimension} />
        ))}
      </div>

      <p className="text-[9px] text-white/25 mt-3 text-center leading-snug">
        &quot;Average gamer&quot; figures are general, rounded estimates for fun comparison — not precisely sourced data.
      </p>
    </div>
  );
}
