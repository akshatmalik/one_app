'use client';

import { useState } from 'react';
import { Game } from '../lib/types';
import { getPeriodStatsForRange, PeriodStats } from '../lib/calculations';
import { GitCompareArrows, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ComparePeriodsCardProps {
  games: Game[];
}

type Preset = '7d' | '30d' | 'month' | 'year';

function rangesFor(preset: Preset): { aStart: Date; aEnd: Date; bStart: Date; bEnd: Date; aLabel: string; bLabel: string } {
  const now = new Date();
  if (preset === '7d') {
    const aEnd = now;
    const aStart = new Date(now); aStart.setDate(now.getDate() - 7);
    const bEnd = new Date(aStart);
    const bStart = new Date(aStart); bStart.setDate(aStart.getDate() - 7);
    return { aStart, aEnd, bStart, bEnd, aLabel: 'Last 7 days', bLabel: 'Prior 7 days' };
  }
  if (preset === '30d') {
    const aEnd = now;
    const aStart = new Date(now); aStart.setDate(now.getDate() - 30);
    const bEnd = new Date(aStart);
    const bStart = new Date(aStart); bStart.setDate(aStart.getDate() - 30);
    return { aStart, aEnd, bStart, bEnd, aLabel: 'Last 30 days', bLabel: 'Prior 30 days' };
  }
  if (preset === 'month') {
    const aStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const aEnd = now;
    const bStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const bEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { aStart, aEnd, bStart, bEnd, aLabel: 'This month', bLabel: 'Last month' };
  }
  const aStart = new Date(now.getFullYear(), 0, 1);
  const aEnd = now;
  const bStart = new Date(now.getFullYear() - 1, 0, 1);
  const bEnd = new Date(now.getFullYear() - 1, 11, 31);
  return { aStart, aEnd, bStart, bEnd, aLabel: 'This year', bLabel: 'Last year' };
}

function Delta({ a, b, suffix = '' }: { a: number; b: number; suffix?: string }) {
  const diff = a - b;
  const Icon = diff > 0.05 ? ArrowUp : diff < -0.05 ? ArrowDown : Minus;
  const color = diff > 0.05 ? 'text-emerald-400' : diff < -0.05 ? 'text-red-400' : 'text-white/30';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
      <Icon size={11} />
      {Math.abs(diff).toFixed(suffix === 'h' ? 1 : 0)}{suffix}
    </span>
  );
}

// NewIdeas100-June2026 — #62 Compare Two Time Periods.
export function ComparePeriodsCard({ games }: ComparePeriodsCardProps) {
  const [preset, setPreset] = useState<Preset>('month');
  const { aStart, aEnd, bStart, bEnd, aLabel, bLabel } = rangesFor(preset);
  const a: PeriodStats = getPeriodStatsForRange(games, aStart, aEnd);
  const b: PeriodStats = getPeriodStatsForRange(games, bStart, bEnd);

  const rows: Array<{ label: string; a: number; b: number; suffix?: string }> = [
    { label: 'Hours', a: a.totalHours, b: b.totalHours, suffix: 'h' },
    { label: 'Sessions', a: a.totalSessions, b: b.totalSessions },
    { label: 'Games played', a: a.uniqueGames, b: b.uniqueGames },
    { label: 'Avg session', a: a.averageSessionLength, b: b.averageSessionLength, suffix: 'h' },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <GitCompareArrows size={16} className="text-indigo-400" /> Compare Periods
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', 'month', 'year'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${
                preset === p ? 'bg-indigo-500/30 text-white' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 text-[10px] uppercase tracking-wide text-white/30">
        <span></span>
        <span className="text-right">{aLabel}</span>
        <span className="text-right">{bLabel}</span>
        <span className="text-right">Δ</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 text-sm">
            <span className="text-white/50">{r.label}</span>
            <span className="text-right font-semibold text-white">{r.a.toFixed(r.suffix === 'h' ? 1 : 0)}{r.suffix}</span>
            <span className="text-right text-white/40">{r.b.toFixed(r.suffix === 'h' ? 1 : 0)}{r.suffix}</span>
            <span className="text-right"><Delta a={r.a} b={r.b} suffix={r.suffix} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
