'use client';

import { useMemo, useState } from 'react';
import { Briefcase, TrendingUp, TrendingDown, ShieldAlert, PieChart as PieChartIcon } from 'lucide-react';
import { Game, AnalyticsSummary } from '../lib/types';
import { getPortfolioAnalysis, PortfolioAllocation, PortfolioHolding } from '../lib/calculations';

interface PortfolioPanelProps {
  games: Game[];
  summary: AnalyticsSummary;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

function AllocationBar({ allocation, color }: { allocation: PortfolioAllocation; color: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-white/60 w-20 shrink-0 truncate" title={allocation.name}>
        {allocation.name}
      </span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${allocation.percentage}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-white/40 w-12 shrink-0 text-right">
        {allocation.percentage}%
      </span>
    </div>
  );
}

function HoldingRow({ holding, tone }: { holding: PortfolioHolding; tone: 'good' | 'bad' }) {
  const color = tone === 'good' ? '#22c55e' : '#ef4444';
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/70 truncate" title={holding.name}>{holding.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-white/30">${holding.price.toFixed(0)} · {holding.hours.toFixed(0)}h</span>
        <span className="text-xs font-bold" style={{ color }}>{holding.roi.toFixed(1)} ROI</span>
      </div>
    </div>
  );
}

const ALLOCATION_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export function PortfolioPanel({ games, summary }: PortfolioPanelProps) {
  const [allocationView, setAllocationView] = useState<'genre' | 'platform'>('genre');
  const data = useMemo(() => getPortfolioAnalysis(games, summary), [games, summary]);

  if (data.holdingsCount === 0) return null;

  const allocations = allocationView === 'genre' ? data.allocationByGenre : data.allocationByPlatform;
  const gradeColor = GRADE_COLORS[data.portfolioGrade];

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
        <Briefcase size={14} className="text-emerald-400" />
        Game Investment Portfolio
      </h4>

      <div className="flex items-center gap-3 mb-3 p-3 bg-white/5 rounded-lg">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full text-xl font-black shrink-0"
          style={{ backgroundColor: `${gradeColor}22`, color: gradeColor, border: `2px solid ${gradeColor}55` }}
        >
          {data.portfolioGrade}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/85">{data.gradeLabel}</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            ${data.totalInvested.toFixed(0)} invested across {data.holdingsCount} holding{data.holdingsCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Backlog Capital</div>
          <div className="text-sm font-bold text-white/80">${data.backlogValue.toFixed(0)}</div>
          <div className="text-[9px] text-white/30">{data.backlogPercentage}% unplayed</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Diversification</div>
          <div className="text-sm font-bold text-white/80">{data.diversificationScore}</div>
          <div className="text-[9px] text-white/30">{data.diversificationLabel}</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-0.5">
            <ShieldAlert size={9} /> Risk
          </div>
          <div className="text-sm font-bold text-white/80">{data.riskScore}</div>
          <div className="text-[9px] text-white/30">{data.riskLabel}</div>
        </div>
      </div>

      {allocations.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-white/50 flex items-center gap-1">
              <PieChartIcon size={11} /> Allocation
            </span>
            <div className="flex gap-1">
              {(['genre', 'platform'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAllocationView(v)}
                  className={`text-[9px] font-medium px-2 py-0.5 rounded-full border transition-colors capitalize ${
                    allocationView === v
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {allocations.map((a, i) => (
            <AllocationBar key={a.name} allocation={a} color={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
          ))}
        </div>
      )}

      {data.topPerformers.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-white/50 flex items-center gap-1 mb-1">
            <TrendingUp size={11} className="text-green-400" /> Top Performers
          </div>
          {data.topPerformers.map(h => <HoldingRow key={h.name} holding={h} tone="good" />)}
        </div>
      )}

      {data.underperformers.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-white/50 flex items-center gap-1 mb-1">
            <TrendingDown size={11} className="text-red-400" /> Underperformers
          </div>
          {data.underperformers.map(h => <HoldingRow key={h.name} holding={h} tone="bad" />)}
        </div>
      )}

      <div className="space-y-1.5">
        {data.suggestions.map((s, i) => (
          <p key={i} className="text-[10px] text-white/40 leading-snug p-2 bg-white/5 rounded-lg">
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}
