'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Sparkles } from 'lucide-react';
import { Game } from '../lib/types';
import { getOscarAwards, OscarAward } from '../lib/calculations';
import clsx from 'clsx';

type OscarPeriod = 'week' | 'month' | 'quarter' | 'alltime';

const PERIOD_LABELS: Record<OscarPeriod, string> = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  alltime: 'All Time',
};

function getPeriodRange(period: OscarPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case 'week': {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { start: new Date(now.getFullYear(), q * 3, 1), end };
    }
    case 'alltime':
    default:
      return { start: new Date(2010, 0, 1), end };
  }
}

// ── Award Card ──────────────────────────────────────────────────

interface AwardCardProps {
  award: OscarAward;
  index: number;
  revealed: boolean;
  onReveal: () => void;
}

function AwardCard({ award, index, revealed, onReveal }: AwardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.3 }}
      className={clsx(
        'rounded-xl border overflow-hidden transition-colors duration-200',
        revealed
          ? 'border-white/10 bg-[#111117]'
          : 'border-amber-800/40 bg-gradient-to-br from-amber-950/30 to-[#0c0c10] cursor-pointer hover:border-amber-600/50 active:scale-[0.97]'
      )}
      onClick={!revealed ? onReveal : undefined}
    >
      {/* Category strip */}
      <div
        className={clsx(
          'px-3 py-2.5 border-b flex items-center gap-2.5',
          revealed ? 'border-white/5 bg-white/[0.02]' : 'border-amber-800/30 bg-amber-950/20'
        )}
      >
        <span className="text-xl leading-none shrink-0">{award.icon}</span>
        <div className="min-w-0 flex-1">
          <div
            className={clsx(
              'text-xs font-bold leading-tight',
              revealed ? 'text-white/60' : 'text-amber-300'
            )}
          >
            {award.categoryLabel}
          </div>
          <div className="text-[10px] text-white/20 italic truncate mt-0.5">
            &ldquo;{award.tagline}&rdquo;
          </div>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait" initial={false}>
        {!revealed ? (
          <motion.div
            key="sealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="p-5 flex flex-col items-center justify-center gap-2"
          >
            <div className="text-3xl">📩</div>
            <div className="text-[10px] font-bold tracking-widest text-amber-400/45 uppercase">
              Tap to reveal
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="p-3"
          >
            {/* Winner */}
            <div className="flex items-center gap-3 mb-2.5">
              {award.winner.thumbnail ? (
                <img
                  src={award.winner.thumbnail}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl shrink-0">
                  🎮
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white leading-tight">
                  {award.winner.gameName}
                </div>
                <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  {award.winner.stat ?? award.winner.reason}
                </div>
              </div>
              <div className="text-xl shrink-0">🥇</div>
            </div>

            {/* Nominees */}
            {award.nominees.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-white/5">
                <div className="text-[9px] font-semibold tracking-widest text-white/15 uppercase mb-1.5">
                  Nominees
                </div>
                {award.nominees.map((n, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-white/30">
                    {n.thumbnail && (
                      <img
                        src={n.thumbnail}
                        alt=""
                        className="w-4 h-4 rounded object-cover flex-shrink-0 opacity-60"
                      />
                    )}
                    <span className="truncate flex-1">{n.gameName}</span>
                    {n.stat && (
                      <span className="text-white/18 text-[10px] shrink-0">{n.stat}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Spotlight decoration ────────────────────────────────────────

function SpotlightLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div className="absolute top-0 left-[22%] w-px h-40 bg-gradient-to-b from-amber-500/18 to-transparent" />
      <div className="absolute top-0 left-[50%] w-px h-56 bg-gradient-to-b from-amber-400/10 to-transparent" />
      <div className="absolute top-0 right-[28%] w-px h-32 bg-gradient-to-b from-amber-500/15 to-transparent" />
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────

interface OscarNightModalProps {
  games: Game[];
  onClose: () => void;
}

export function OscarNightModal({ games, onClose }: OscarNightModalProps) {
  const [period, setPeriod] = useState<OscarPeriod>('month');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const awardsData = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return getOscarAwards(games, start, end);
  }, [games, period]);

  const handlePeriodChange = (p: OscarPeriod) => {
    setPeriod(p);
    setRevealed(new Set());
  };

  const handleReveal = (category: string) => {
    setRevealed(prev => new Set([...prev, category]));
  };

  const handleRevealAll = () => {
    setRevealed(new Set(awardsData.awards.map(a => a.category)));
  };

  const allRevealed =
    awardsData.awards.length > 0 && revealed.size >= awardsData.awards.length;

  return (
    <div className="fixed inset-0 z-[70] bg-[#06060a] flex flex-col">
      <SpotlightLines />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b border-amber-900/30 shrink-0 bg-[#06060a]">
        <div className="flex items-center gap-2.5">
          <Film size={18} className="text-amber-400" />
          <div>
            <div className="text-base font-black text-white tracking-tight leading-tight">
              The Auto Awards
            </div>
            <div className="text-[10px] text-amber-500/50 tracking-widest uppercase font-semibold">
              Data-Driven Ceremony
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Period selector + Reveal All */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0 bg-[#06060a]">
        <div className="flex gap-1 flex-1 min-w-0">
          {(['week', 'month', 'quarter', 'alltime'] as OscarPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all',
                period === p
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-white/25 hover:text-white/50 bg-white/[0.025]'
              )}
            >
              {p === 'alltime' ? 'All Time' : p === 'quarter' ? 'Quarter' : p === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
        {!allRevealed && awardsData.awards.length > 0 && (
          <button
            onClick={handleRevealAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/22 border border-amber-500/25 rounded-lg text-amber-300 text-[10px] sm:text-[11px] font-bold transition-all shrink-0 whitespace-nowrap"
          >
            <Sparkles size={11} />
            Reveal All
          </button>
        )}
      </div>

      {/* Period label */}
      <div className="px-4 py-2 shrink-0 bg-[#06060a]">
        <div className="text-[11px] text-white/25">
          <span className="text-amber-400/60 font-medium">{awardsData.periodLabel}</span>
          {awardsData.awards.length > 0 && (
            <span className="ml-2">
              · {awardsData.awards.length} categories · {revealed.size}/{awardsData.awards.length} revealed
            </span>
          )}
        </div>
      </div>

      {/* Awards grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        {awardsData.awards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <div className="text-5xl">🎬</div>
            <div className="text-sm text-white/30 text-center leading-relaxed">
              Not enough data for this period.
              <br />
              <span className="text-white/20 text-xs">
                Try a longer period, or log more sessions.
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3">
              {awardsData.awards.map((award, i) => (
                <AwardCard
                  key={award.category}
                  award={award}
                  index={i}
                  revealed={revealed.has(award.category)}
                  onReveal={() => handleReveal(award.category)}
                />
              ))}
            </div>

            <AnimatePresence>
              {allRevealed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 py-6 flex flex-col items-center gap-2"
                >
                  <div className="text-4xl">🎊</div>
                  <div className="text-sm text-white/50 font-medium">That&apos;s a wrap!</div>
                  <div className="text-xs text-white/25">
                    All {PERIOD_LABELS[period].toLowerCase()} awards revealed.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
