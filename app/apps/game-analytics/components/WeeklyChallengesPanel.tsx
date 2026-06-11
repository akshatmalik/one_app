'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Game } from '../lib/types';
import { getWeeklyChallenges, WeeklyChallenge } from '../lib/calculations';
import clsx from 'clsx';

interface WeeklyChallengesPanelProps {
  games: Game[];
}

const CATEGORY_STYLES = {
  activity: {
    bg: 'from-blue-500/15 to-cyan-500/8',
    border: 'border-blue-500/20',
    progress: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    text: 'text-blue-400',
  },
  variety: {
    bg: 'from-purple-500/15 to-violet-500/8',
    border: 'border-purple-500/20',
    progress: 'bg-gradient-to-r from-purple-500 to-violet-500',
    text: 'text-purple-400',
  },
  exploration: {
    bg: 'from-emerald-500/15 to-teal-500/8',
    border: 'border-emerald-500/20',
    progress: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-emerald-400',
  },
  completion: {
    bg: 'from-yellow-500/15 to-amber-500/8',
    border: 'border-yellow-500/20',
    progress: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    text: 'text-yellow-400',
  },
};

function getWeekLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${weekEnd.toLocaleDateString('en-US', opts)}`;
}

function ChallengeCard({ challenge }: { challenge: WeeklyChallenge }) {
  const styles = CATEGORY_STYLES[challenge.category];
  const pct = Math.min((challenge.current / challenge.target) * 100, 100);

  return (
    <motion.div
      layout
      className={clsx(
        'relative p-3.5 rounded-xl border transition-all overflow-hidden',
        challenge.completed
          ? 'bg-gradient-to-br from-emerald-500/15 to-green-500/8 border-emerald-500/25'
          : `bg-gradient-to-br ${styles.bg} ${styles.border}`
      )}
    >
      {/* Completion glow */}
      {challenge.completed && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
      )}

      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 shrink-0 leading-none">{challenge.icon}</span>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={clsx(
              'text-sm font-semibold leading-tight',
              challenge.completed ? 'text-emerald-300' : 'text-white/90'
            )}>
              {challenge.title}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0">
              {challenge.completed ? (
                <CheckCircle2 size={14} className="text-emerald-400" />
              ) : (
                <span className={clsx('text-xs font-bold tabular-nums', styles.text)}>
                  {challenge.current}/{challenge.target}
                  <span className="font-normal text-white/30 ml-0.5">{challenge.unit}</span>
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-white/35 mb-2 leading-relaxed">{challenge.description}</p>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={clsx(
                'h-full rounded-full',
                challenge.completed ? 'bg-gradient-to-r from-emerald-500 to-green-400' : styles.progress
              )}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Hint */}
          {challenge.hint && !challenge.completed && (
            <p className="text-[10px] text-white/20 mt-1.5 italic">{challenge.hint}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function WeeklyChallengesPanel({ games }: WeeklyChallengesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const challenges = useMemo(() => getWeeklyChallenges(games), [games]);
  const completed = challenges.filter(c => c.completed).length;
  const weekLabel = useMemo(() => getWeekLabel(), []);

  // Hide panel for very small libraries
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length < 2) return null;

  const allDone = completed === 5;

  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-2.5">
          <Target size={17} className="text-cyan-400 shrink-0" />
          <div className="text-left">
            <h2 className="text-base font-semibold text-white leading-tight">
              Weekly Challenges
            </h2>
            <p className="text-[11px] text-white/25 mt-0.5">{weekLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Completion pill */}
          <div className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
            allDone
              ? 'bg-emerald-500/20 text-emerald-400'
              : completed > 0
                ? 'bg-white/8 text-white/50'
                : 'bg-white/5 text-white/20'
          )}>
            <span>{completed}/5</span>
            {allDone && <span className="text-base leading-none">🎉</span>}
          </div>
          {collapsed
            ? <ChevronDown size={15} className="text-white/25 group-hover:text-white/50 transition-colors" />
            : <ChevronUp size={15} className="text-white/25 group-hover:text-white/50 transition-colors" />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Challenge cards */}
            <div className="mt-4 space-y-2">
              {challenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} />
              ))}
            </div>

            {/* Week progress dots */}
            <div className="mt-4 pt-3.5 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/20 uppercase tracking-wider">Week progress</span>
                <span className="text-[10px] text-white/25">
                  {allDone
                    ? '🏆 Perfect week!'
                    : completed === 0
                      ? 'Get going!'
                      : `${completed} of 5 complete`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {challenges.map(c => (
                  <div
                    key={c.id}
                    className={clsx(
                      'h-1.5 flex-1 rounded-full transition-all duration-500',
                      c.completed ? 'bg-emerald-500' : 'bg-white/8'
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
