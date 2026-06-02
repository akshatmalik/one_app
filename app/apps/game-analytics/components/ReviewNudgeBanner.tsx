'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, X, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { getReviewNudges, ReviewNudge, ReviewNudgeReason } from '../lib/calculations';
import { Game } from '../lib/types';

interface ReviewNudgeBannerProps {
  games: Game[];
  /** Opens the review chat / interview for the chosen game. */
  onReview: (game: Game) => void;
}

const SNOOZE_KEY = 'review-nudge-snooze'; // { [gameId]: ISO snooze-until }
const DISMISS_KEY = 'review-nudge-dismissed-on'; // toDateString of last full dismiss
const SNOOZE_DAYS = 6;

const reasonStyle: Record<ReviewNudgeReason, { bg: string; text: string; border: string; label: string }> = {
  'just-finished':        { bg: 'from-emerald-500/10 to-teal-500/10',  text: 'text-emerald-300', border: 'border-emerald-500/20', label: 'Just finished' },
  'special-unreviewed':   { bg: 'from-yellow-500/10 to-amber-500/10',  text: 'text-amber-300',   border: 'border-amber-500/20',   label: 'One of your specials' },
  'completed-unreviewed': { bg: 'from-blue-500/10 to-indigo-500/10',   text: 'text-blue-300',    border: 'border-blue-500/20',    label: 'Completed' },
  'farewell':             { bg: 'from-purple-500/10 to-fuchsia-500/10', text: 'text-purple-300',  border: 'border-purple-500/20',  label: 'Abandoned' },
  'rated-no-words':       { bg: 'from-pink-500/10 to-rose-500/10',     text: 'text-pink-300',    border: 'border-pink-500/20',    label: 'Rated, not reviewed' },
  'invested-no-words':    { bg: 'from-cyan-500/10 to-sky-500/10',      text: 'text-cyan-300',    border: 'border-cyan-500/20',    label: 'Hours invested' },
};

function readSnoozes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function ReviewNudgeBanner({ games, onReview }: ReviewNudgeBannerProps) {
  const [dismissedToday, setDismissedToday] = useState(false);
  const [snoozes, setSnoozes] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const today = new Date().toDateString();
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === today) {
      setDismissedToday(true);
    }
    setSnoozes(readSnoozes());
  }, []);

  const summary = useMemo(() => getReviewNudges(games), [games]);

  // Candidates not currently snoozed.
  const active = useMemo(() => {
    const now = Date.now();
    return summary.candidates.filter(n => {
      const until = snoozes[n.game.id];
      return !until || new Date(until).getTime() <= now;
    });
  }, [summary.candidates, snoozes]);

  const nudge: ReviewNudge | undefined = active[Math.min(idx, active.length - 1)];

  if (dismissedToday || !nudge || summary.reviewableCount === 0) return null;

  const style = reasonStyle[nudge.reason];
  const { reviewedCount, reviewableCount } = summary;
  const progress = reviewableCount > 0 ? Math.round((reviewedCount / reviewableCount) * 100) : 0;
  const remaining = active.length;

  const snooze = (gameId: string) => {
    const until = new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString();
    const next = { ...readSnoozes(), [gameId]: until };
    if (typeof window !== 'undefined') localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    setSnoozes(next);
    setIdx(0);
  };

  const dismissForToday = () => {
    if (typeof window !== 'undefined') localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setDismissedToday(true);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nudge.game.id}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className={`relative mb-4 overflow-hidden rounded-xl border bg-gradient-to-r ${style.bg} ${style.border}`}
      >
        {/* Dismiss for the day */}
        <button
          onClick={dismissForToday}
          className="absolute top-2 right-2 z-10 rounded-md p-1 text-white/20 transition-colors hover:bg-white/10 hover:text-white/50"
          aria-label="Not now"
          title="Not now"
        >
          <X size={12} />
        </button>

        <div className="flex items-start gap-3 px-4 py-3">
          {/* Thumbnail / icon */}
          {nudge.game.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nudge.game.thumbnail}
              alt={nudge.game.name}
              className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 ${style.text}`}>
              <PenLine size={20} />
            </div>
          )}

          <div className="min-w-0 flex-1 pr-5">
            <div className="mb-0.5 flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>
                {style.label}
              </span>
              {remaining > 1 && (
                <span className="text-[10px] text-white/30">· {remaining} games waiting</span>
              )}
            </div>

            <p className="text-sm leading-snug text-white/80">{nudge.headline}</p>

            {/* Actions */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onReview(nudge.game)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                  'bg-white/10 text-white transition-colors hover:bg-white/20'
                )}
              >
                <PenLine size={13} />
                {nudge.ctaLabel}
              </button>

              <button
                onClick={() => snooze(nudge.game.id)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
              >
                Maybe later
              </button>

              {remaining > 1 && (
                <button
                  onClick={() => setIdx(i => (i + 1) % remaining)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
                  title="Show another"
                >
                  Next <ChevronRight size={13} />
                </button>
              )}
            </div>

            {/* Gentle progress — frames reviewing as a finishable collection */}
            {reviewableCount > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${style.bg.replace(/\/10/g, '/70')}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/40">
                  <Check size={10} className={progress === 100 ? 'text-emerald-400' : 'text-white/30'} />
                  {reviewedCount}/{reviewableCount} reviewed
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
