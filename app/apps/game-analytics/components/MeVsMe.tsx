'use client';

import { useRef, useState, useMemo } from 'react';
import { X, ArrowUp, ArrowDown, Minus, Swords } from 'lucide-react';
import { Game } from '../lib/types';
import { getPeriodStatsForRange } from '../lib/calculations';
import { formatHours } from '../lib/format';
import { ShareButton } from './ShareButton';

interface MeVsMeProps {
  games: Game[];
  onClose: () => void;
}

type Preset = { label: string; days: number; thisLabel: string; prevLabel: string };
const PRESETS: Preset[] = [
  { label: '7 days', days: 7, thisLabel: 'This week', prevLabel: 'Last week' },
  { label: '30 days', days: 30, thisLabel: 'This month', prevLabel: 'Last month' },
  { label: '90 days', days: 90, thisLabel: 'This quarter', prevLabel: 'Last quarter' },
  { label: '365 days', days: 365, thisLabel: 'This year', prevLabel: 'Last year' },
];

/**
 * "Me vs Me" — compare any rolling period against the one before it.
 * Reuses getPeriodStatsForRange (shared with getPeriodStats) and the share hub.
 */
export function MeVsMe({ games, onClose }: MeVsMeProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[1]);

  const { current, previous } = useMemo(() => {
    const now = new Date();
    const start = new Date(); start.setDate(now.getDate() - preset.days);
    const prevStart = new Date(); prevStart.setDate(now.getDate() - preset.days * 2);
    const prevEnd = new Date(start); prevEnd.setDate(start.getDate() - 1);
    return {
      current: getPeriodStatsForRange(games, start, now),
      previous: getPeriodStatsForRange(games, prevStart, prevEnd),
    };
  }, [games, preset]);

  const rows = [
    { label: 'Hours', now: current.totalHours, prev: previous.totalHours, fmt: (n: number) => formatHours(n) },
    { label: 'Sessions', now: current.totalSessions, prev: previous.totalSessions, fmt: (n: number) => `${n}` },
    { label: 'Games', now: current.uniqueGames, prev: previous.uniqueGames, fmt: (n: number) => `${n}` },
    { label: 'Avg session', now: current.averageSessionLength, prev: previous.averageSessionLength, fmt: (n: number) => formatHours(n) },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Preset selector (excluded from capture) */}
        <div data-share-hide="true" className="flex items-center justify-center gap-1.5 mb-3">
          {PRESETS.map(p => (
            <button
              key={p.days}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                p.days === preset.days ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Capture target */}
        <div ref={cardRef} className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-950 p-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Swords size={16} className="text-purple-400" />
            <span className="text-xs uppercase tracking-widest text-white/40">Me vs Me</span>
          </div>
          <div className="flex items-center justify-between text-center mb-4">
            <div className="flex-1 text-xs font-medium text-white/40">{preset.prevLabel}</div>
            <div className="w-8" />
            <div className="flex-1 text-xs font-medium text-purple-300">{preset.thisLabel}</div>
          </div>

          <div className="space-y-2">
            {rows.map(row => {
              const delta = row.now - row.prev;
              const up = delta > 0.01, down = delta < -0.01;
              return (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div className="flex-1 text-center text-sm text-white/60">{row.fmt(row.prev)}</div>
                  <div className="w-20 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-white/30">{row.label}</div>
                    <div className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? 'text-emerald-400' : down ? 'text-red-400' : 'text-white/30'}`}>
                      {up ? <ArrowUp size={11} /> : down ? <ArrowDown size={11} /> : <Minus size={11} />}
                      {row.fmt(Math.abs(delta))}
                    </div>
                  </div>
                  <div className="flex-1 text-center text-lg font-bold text-white">{row.fmt(row.now)}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/25">Game Analytics</div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors">
            <X size={15} /> Close
          </button>
          <ShareButton targetRef={cardRef} filename="me-vs-me" shareText="My gaming, this period vs last." />
        </div>
      </div>
    </div>
  );
}
