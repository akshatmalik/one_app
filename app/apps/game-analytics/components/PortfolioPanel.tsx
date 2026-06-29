'use client';

import { useMemo, useState } from 'react';
import { Briefcase, TrendingUp, TrendingDown, ShieldAlert, PieChart as PieChartIcon, X, ArrowRight } from 'lucide-react';
import { Game, AnalyticsSummary } from '../lib/types';
import {
  getPortfolioAnalysis,
  simulatePortfolioWithoutHolding,
  getPortfolioSliceHoldings,
  PortfolioAllocation,
  PortfolioHolding,
} from '../lib/calculations';

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

function AllocationBar({
  allocation,
  color,
  onSelect,
}: {
  allocation: PortfolioAllocation;
  color: string;
  onSelect: (name: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(allocation.name)}
      className="flex items-center gap-2 py-1 w-full text-left hover:bg-white/5 rounded transition-colors -mx-1 px-1"
    >
      <span className="text-[10px] text-white/60 w-20 shrink-0 truncate" title={allocation.name}>
        {allocation.name}
      </span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${allocation.percentage}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-white/40 w-12 shrink-0 text-right">
        {allocation.percentage}%
      </span>
    </button>
  );
}

function HoldingRow({
  holding,
  tone,
  onSelect,
}: {
  holding: PortfolioHolding;
  tone: 'good' | 'bad';
  onSelect: (name: string) => void;
}) {
  const color = tone === 'good' ? '#22c55e' : '#ef4444';
  return (
    <button
      type="button"
      onClick={() => onSelect(holding.name)}
      className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0 w-full text-left hover:bg-white/5 transition-colors rounded"
    >
      <span className="text-xs text-white/70 truncate" title={holding.name}>{holding.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-white/30">${holding.price.toFixed(0)} · {holding.hours.toFixed(0)}h</span>
        <span className="text-xs font-bold" style={{ color }}>{holding.roi.toFixed(1)} ROI</span>
      </div>
    </button>
  );
}

const ALLOCATION_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export function PortfolioPanel({ games, summary }: PortfolioPanelProps) {
  const [allocationView, setAllocationView] = useState<'genre' | 'platform'>('genre');
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [sellSimGame, setSellSimGame] = useState<string | null>(null);
  const data = useMemo(() => getPortfolioAnalysis(games, summary), [games, summary]);

  const sliceHoldings = useMemo(
    () => (selectedSlice ? getPortfolioSliceHoldings(games, allocationView, selectedSlice) : []),
    [games, allocationView, selectedSlice]
  );

  const simulation = useMemo(
    () => (sellSimGame ? simulatePortfolioWithoutHolding(games, summary, sellSimGame) : null),
    [games, summary, sellSimGame]
  );

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
                  onClick={() => { setAllocationView(v); setSelectedSlice(null); }}
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
            <AllocationBar
              key={a.name}
              allocation={a}
              color={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]}
              onSelect={setSelectedSlice}
            />
          ))}
          {selectedSlice && (
            <div className="mt-2 p-2.5 bg-black/20 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-white/60">
                  {selectedSlice} holdings
                </span>
                <button type="button" onClick={() => setSelectedSlice(null)} className="text-white/30 hover:text-white/60">
                  <X size={12} />
                </button>
              </div>
              {sliceHoldings.length === 0 ? (
                <p className="text-[10px] text-white/30">No paid holdings in this slice.</p>
              ) : (
                <div className="space-y-1">
                  {sliceHoldings.map(h => (
                    <div key={h.name} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-white/60 truncate">{h.name}</span>
                      <span className="text-white/30 shrink-0">${h.invested.toFixed(0)} · {h.hours.toFixed(0)}h · {h.roi.toFixed(1)} ROI</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {data.topPerformers.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-white/50 flex items-center gap-1 mb-1">
            <TrendingUp size={11} className="text-green-400" /> Top Performers
          </div>
          {data.topPerformers.map(h => <HoldingRow key={h.name} holding={h} tone="good" onSelect={setSellSimGame} />)}
        </div>
      )}

      {data.underperformers.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-white/50 flex items-center gap-1 mb-1">
            <TrendingDown size={11} className="text-red-400" /> Underperformers
          </div>
          {data.underperformers.map(h => <HoldingRow key={h.name} holding={h} tone="bad" onSelect={setSellSimGame} />)}
        </div>
      )}

      {simulation && (
        <div className="mb-3 p-3 bg-black/20 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-white/60">Sell Simulator — {simulation.gameName}</span>
            <button type="button" onClick={() => setSellSimGame(null)} className="text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-black"
              style={{ backgroundColor: `${GRADE_COLORS[simulation.beforeGrade]}22`, color: GRADE_COLORS[simulation.beforeGrade], border: `1.5px solid ${GRADE_COLORS[simulation.beforeGrade]}55` }}
            >
              {simulation.beforeGrade}
            </div>
            <ArrowRight size={14} className="text-white/30" />
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-black"
              style={{ backgroundColor: `${GRADE_COLORS[simulation.afterGrade]}22`, color: GRADE_COLORS[simulation.afterGrade], border: `1.5px solid ${GRADE_COLORS[simulation.afterGrade]}55` }}
            >
              {simulation.afterGrade}
            </div>
            <span className={`text-xs font-bold ${simulation.scoreDelta > 0 ? 'text-green-400' : simulation.scoreDelta < 0 ? 'text-red-400' : 'text-white/40'}`}>
              {simulation.scoreDelta > 0 ? '+' : ''}{simulation.scoreDelta} pts
            </span>
          </div>
          <p className="text-[10px] text-white/50 leading-snug text-center">{simulation.verdict}</p>
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
