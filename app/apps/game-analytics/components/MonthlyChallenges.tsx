'use client';

import { useState, useEffect, useMemo } from 'react';
import { Target, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { getMonthlyChallenges, MonthlyChallenge } from '../lib/challenges';

const STORAGE_KEY = 'game-analytics-challenges-open';

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, complete }: { value: number; complete: boolean }) {
  return (
    <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden mt-2">
      <div
        className={clsx(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          complete ? 'bg-emerald-400/70' : 'bg-purple-500/60',
        )}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

// ── Single challenge card ─────────────────────────────────────────────────────

function ChallengeCard({ c }: { c: MonthlyChallenge }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
        c.complete
          ? 'bg-emerald-500/[0.04] border-emerald-500/10'
          : 'bg-white/[0.02] border-white/[0.05]',
      )}
    >
      {/* Thumbnail or emoji icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-white/[0.04] flex items-center justify-center">
        {c.game?.thumbnail ? (
          <img
            src={c.game.thumbnail}
            alt={c.game.name}
            className={clsx('w-full h-full object-cover', c.complete && 'opacity-50')}
            loading="lazy"
          />
        ) : (
          <span className="text-base leading-none">{c.emoji}</span>
        )}
      </div>

      {/* Text + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {c.complete && (
            <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
          )}
          <p
            className={clsx(
              'text-[11px] font-semibold leading-snug truncate',
              c.complete ? 'text-emerald-400/65 line-through' : 'text-white/70',
            )}
          >
            {c.title}
          </p>
        </div>
        <p className="text-[10px] text-white/28 mt-0.5 leading-snug truncate">
          {c.complete ? c.completedText : c.hint}
        </p>
        <ProgressBar value={c.progress} complete={c.complete} />
      </div>

      {/* Percentage */}
      <div className="flex-shrink-0">
        <span
          className={clsx(
            'text-[10px] font-semibold tabular-nums',
            c.complete ? 'text-emerald-400/55' : 'text-white/20',
          )}
        >
          {c.progress}%
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MonthlyChallengesProps {
  games: Game[];
}

export function MonthlyChallenges({ games }: MonthlyChallengesProps) {
  const challenges = useMemo(() => getMonthlyChallenges(games), [games]);

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(open));
    }
  }, [open]);

  if (challenges.length === 0) return null;

  const completed = challenges.filter(c => c.complete).length;
  const total = challenges.length;
  const allDone = completed === total;
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.01] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Target size={12} className="text-purple-400/80 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-white/55 tracking-wide">
            {monthName} Challenges
          </span>
          <span
            className={clsx(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
              allDone
                ? 'bg-emerald-500/20 text-emerald-400'
                : completed > 0
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-white/[0.05] text-white/25',
            )}
          >
            {completed}/{total}
          </span>
        </div>
        {open ? (
          <ChevronUp size={12} className="text-white/20" />
        ) : (
          <ChevronDown size={12} className="text-white/20" />
        )}
      </button>

      {/* Challenge list */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {challenges.map(c => (
            <ChallengeCard key={c.id} c={c} />
          ))}
          {allDone && (
            <p className="text-center text-[10px] text-emerald-400/50 pt-1">
              All done! 🎉 New challenges unlock next month.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
