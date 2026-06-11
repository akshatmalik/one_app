'use client';

import { useMemo, useState } from 'react';
import { Zap, Trophy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  generateWeeklyChallenges,
  getWeeklyChallengeProgress,
} from '../lib/calculations';

interface WeeklyChallengesPanelProps {
  games: Game[];
}

const TIER_CONFIG = {
  bronze: {
    label: 'Bronze',
    color: '#cd7f32',
    icon: '🥉',
    borderActive: 'border-amber-700/40',
    bgActive: 'from-amber-900/20 to-amber-800/5',
    textActive: 'text-amber-500',
  },
  silver: {
    label: 'Silver',
    color: '#b0b0b0',
    icon: '🥈',
    borderActive: 'border-slate-400/30',
    bgActive: 'from-slate-500/15 to-slate-500/5',
    textActive: 'text-slate-300',
  },
  gold: {
    label: 'Gold',
    color: '#ffd700',
    icon: '🥇',
    borderActive: 'border-yellow-500/35',
    bgActive: 'from-yellow-500/15 to-yellow-500/5',
    textActive: 'text-yellow-400',
  },
} as const;

const STORAGE_KEY = 'game-analytics-weekly-challenges-collapsed';

function getDaysUntilMonday(): number {
  const day = new Date().getDay();
  if (day === 1) return 7;
  if (day === 0) return 1;
  return 8 - day;
}

export function WeeklyChallengesPanel({ games }: WeeklyChallengesPanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const challenges = useMemo(() => generateWeeklyChallenges(games), [games]);
  const progresses = useMemo(
    () => challenges.map(c => getWeeklyChallengeProgress(c, games)),
    [challenges, games],
  );

  const completedCount = progresses.filter(p => p.completed).length;
  const allComplete = completedCount === 3;
  const daysLeft = getDaysUntilMonday();

  if (games.filter(g => g.status !== 'Wishlist').length < 1) return null;

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  };

  return (
    <div
      className={clsx(
        'mb-4 rounded-xl border overflow-hidden transition-colors',
        allComplete
          ? 'border-yellow-500/25 bg-gradient-to-br from-yellow-500/6 to-amber-600/3'
          : 'border-white/[0.06] bg-white/[0.015]',
      )}
    >
      {/* Header row — always visible, toggles panel */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors"
        aria-expanded={!collapsed}
        aria-label="Toggle weekly challenges"
      >
        <div className="flex items-center gap-2">
          {allComplete
            ? <Trophy size={12} className="text-yellow-400 shrink-0" />
            : <Zap size={12} className="text-purple-400 shrink-0" />
          }
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
            {allComplete ? 'Week Complete!' : 'Weekly Challenges'}
          </span>
          <span
            className={clsx(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
              allComplete
                ? 'bg-yellow-500/20 text-yellow-400'
                : completedCount > 0
                ? 'bg-purple-500/15 text-purple-400'
                : 'bg-white/5 text-white/25',
            )}
          >
            {completedCount}/3
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/20">
            {daysLeft === 1 ? 'Resets tomorrow' : `Resets in ${daysLeft}d`}
          </span>
          {collapsed
            ? <ChevronDown size={11} className="text-white/20" />
            : <ChevronUp size={11} className="text-white/20" />
          }
        </div>
      </button>

      {/* Challenge rows */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {challenges.map((challenge, i) => {
            const prog = progresses[i];
            const tier = TIER_CONFIG[challenge.tier];

            return (
              <div
                key={challenge.id}
                className={clsx(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all',
                  prog.completed
                    ? `bg-gradient-to-r ${tier.bgActive} ${tier.borderActive}`
                    : 'border-white/[0.04] bg-white/[0.01]',
                )}
              >
                {/* Tier emoji */}
                <span className="text-base shrink-0 select-none leading-none">
                  {tier.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p
                      className={clsx(
                        'text-xs font-medium leading-tight truncate',
                        prog.completed ? 'text-white/85' : 'text-white/50',
                      )}
                    >
                      {challenge.title}
                    </p>
                    {prog.completed ? (
                      <span
                        className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center border"
                        style={{
                          borderColor: `${tier.color}55`,
                          backgroundColor: `${tier.color}18`,
                        }}
                      >
                        <Check size={9} style={{ color: tier.color }} />
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-medium text-white/25 tabular-nums">
                        {Math.round(prog.percentage)}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(prog.percentage > 0 ? 2 : 0, prog.percentage)}%`,
                        backgroundColor: prog.completed ? tier.color : 'rgba(255,255,255,0.14)',
                      }}
                    />
                  </div>

                  {/* Sub-label */}
                  {!prog.completed && (
                    <p className="text-[9px] text-white/20 mt-0.5 leading-none">
                      {prog.progressLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {allComplete && (
            <p className="text-center text-[10px] text-yellow-400/50 pt-0.5">
              🎉 You crushed this week! New challenges arrive next Monday.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
