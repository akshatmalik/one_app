'use client';

import { useMemo } from 'react';
import {
  Briefcase, TrendingUp, TrendingDown, PieChart as PieChartIcon, AlertTriangle, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Game } from '../lib/types';
import { getPortfolioAnalysis, PortfolioHolding } from '../lib/calculations';
import clsx from 'clsx';

interface PortfolioPanelProps {
  games: Game[];
}

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

function HoldingRow({ holding, accent, valueLabel }: { holding: PortfolioHolding; accent: string; valueLabel: string }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
      {holding.thumbnail ? (
        <img
          src={holding.thumbnail}
          alt={holding.name}
          className="w-10 h-10 object-cover rounded shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80 truncate">{holding.name}</div>
        <div className="text-[10px] text-white/40">{holding.genre || 'Uncategorized'} · ${holding.invested.toFixed(0)} invested</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold" style={{ color: accent }}>{valueLabel}</div>
      </div>
    </div>
  );
}

export function PortfolioPanel({ games }: PortfolioPanelProps) {
  const portfolio = useMemo(() => getPortfolioAnalysis(games), [games]);

  if (portfolio.holdingsCount === 0) return null;

  const isGain = portfolio.netGainLoss >= 0;
  const gradeColor = GRADE_COLORS[portfolio.portfolioGrade] || '#9ca3af';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Briefcase size={14} className="text-emerald-400" />
        Portfolio Mode
      </h3>

      {/* Hero: portfolio grade + net gain/loss */}
      <div className="p-4 bg-gradient-to-br from-emerald-500/15 to-blue-500/15 border border-emerald-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wide">Portfolio Grade</div>
            <div className="text-4xl font-black" style={{ color: gradeColor }}>{portfolio.portfolioGrade}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40 uppercase tracking-wide">Net Return</div>
            <div className={clsx('text-2xl font-bold flex items-center gap-1 justify-end', isGain ? 'text-emerald-400' : 'text-red-400')}>
              {isGain ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {portfolio.returnPercentage >= 0 ? '+' : ''}{portfolio.returnPercentage.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-white/5 rounded-lg text-center">
            <div className="text-base font-bold text-white">${portfolio.totalInvested.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">invested</div>
          </div>
          <div className="p-2 bg-white/5 rounded-lg text-center">
            <div className="text-base font-bold text-blue-400">${portfolio.totalValueDelivered.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">value delivered</div>
          </div>
          <div className="p-2 bg-white/5 rounded-lg text-center">
            <div className={clsx('text-base font-bold', isGain ? 'text-emerald-400' : 'text-red-400')}>
              {isGain ? '+' : ''}${portfolio.netGainLoss.toFixed(0)}
            </div>
            <div className="text-[10px] text-white/40">net gain/loss</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-white/30 text-center">
          Value delivered values your hours at the $3.50/hr baseline entertainment rate from the Guilt-Free Gaming Calculator.
        </div>
      </div>

      {/* Value over time */}
      {portfolio.valueOverTime.length >= 2 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-blue-400" />
            Portfolio Value Over Time
          </h4>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolio.valueOverTime}>
                <defs>
                  <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                          <p className="text-white/90 font-medium mb-1">{label}</p>
                          <p className="text-orange-400">Invested: ${(payload.find(p => p.dataKey === 'cumulativeInvested')?.value as number || 0).toFixed(0)}</p>
                          <p className="text-emerald-400">Value: ${(payload.find(p => p.dataKey === 'cumulativeValueDelivered')?.value as number || 0).toFixed(0)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="cumulativeInvested" stroke="#f97316" fill="url(#investedGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="cumulativeValueDelivered" stroke="#10b981" fill="url(#valueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-white/40 justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Invested</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Value delivered</span>
          </div>
        </div>
      )}

      {/* Asset allocation by genre */}
      {portfolio.allocation.length > 0 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <PieChartIcon size={14} className="text-purple-400" />
              Asset Allocation
            </h4>
            <span className="text-[10px] text-white/40">Diversification: {portfolio.diversificationScore}/100</span>
          </div>
          <div className="space-y-2">
            {portfolio.allocation.slice(0, 6).map(a => (
              <div key={a.genre}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white/60">{a.genre}</span>
                  <span className="text-white/70 font-medium">${a.invested.toFixed(0)} · {a.percentage.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500/70" style={{ width: `${a.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Star performers */}
      {portfolio.starPerformers.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-400" />
            Star Performers
          </h4>
          <div className="space-y-2">
            {portfolio.starPerformers.map(h => (
              <HoldingRow key={h.id} holding={h} accent="#10b981" valueLabel={`${h.roi.toFixed(1)} ROI`} />
            ))}
          </div>
        </div>
      )}

      {/* Underperformers */}
      {portfolio.underperformers.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-red-400" />
            Underperformers
          </h4>
          <div className="space-y-2">
            {portfolio.underperformers.map(h => (
              <HoldingRow key={h.id} holding={h} accent="#ef4444" valueLabel={`$${h.costPerHour.toFixed(2)}/hr`} />
            ))}
          </div>
        </div>
      )}

      {/* Dead capital */}
      {portfolio.deadCapital.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-gray-500/10 to-transparent border border-white/10 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-gray-400" />
            Dead Capital
          </h4>
          <div className="space-y-2">
            {portfolio.deadCapital.map(h => (
              <HoldingRow key={h.id} holding={h} accent="#9ca3af" valueLabel="0h played" />
            ))}
          </div>
        </div>
      )}

      {/* Rebalancing suggestions */}
      {portfolio.rebalancingSuggestions.length > 0 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 mb-2">Rebalancing Suggestions</h4>
          <ul className="space-y-1.5">
            {portfolio.rebalancingSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
