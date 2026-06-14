'use client';

import { useState, useMemo, useEffect } from 'react';
import { Target, CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, Zap, Trophy } from 'lucide-react';
import { Game } from '../lib/types';
import {
  generateDailyChallenges,
  getDailyData,
  toggleChallengeComplete,
  getChallengeStreak,
  DailyChallenge,
} from '../lib/daily-challenges';
import clsx from 'clsx';

interface DailyChallengesCardProps {
  games: Game[];
  userId: string | null;
  onOpenGame?: (gameId: string) => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  streak:   'text-orange-400',
  session:  'text-purple-400',
  explore:  'text-emerald-400',
  review:   'text-amber-400',
  backlog:  'text-blue-400',
  complete: 'text-cyan-400',
  organize: 'text-indigo-400',
};

const CATEGORY_BG: Record<string, string> = {
  streak:   'bg-orange-500/10 border-orange-500/20',
  session:  'bg-purple-500/10 border-purple-500/20',
  explore:  'bg-emerald-500/10 border-emerald-500/20',
  review:   'bg-amber-500/10 border-amber-500/20',
  backlog:  'bg-blue-500/10 border-blue-500/20',
  complete: 'bg-cyan-500/10 border-cyan-500/20',
  organize: 'bg-indigo-500/10 border-indigo-500/20',
};

function ChallengeRow({
  challenge,
  completed,
  onToggle,
  onGameClick,
}: {
  challenge: DailyChallenge;
  completed: boolean;
  onToggle: () => void;
  onGameClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200',
        completed
          ? 'bg-white/[0.015] border-white/5 opacity-55'
          : `${CATEGORY_BG[challenge.category] ?? 'bg-white/[0.03] border-white/10'} hover:opacity-90`,
      )}
    >
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 transition-transform active:scale-90"
        aria-label={completed ? 'Unmark' : 'Mark complete'}
      >
        {completed ? (
          <CheckCircle2 size={18} className="text-emerald-400" />
        ) : (
          <Circle size={18} className="text-white/25 hover:text-white/50 transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[15px] leading-none">{challenge.icon}</span>
          <span
            className={clsx(
              'text-sm font-semibold leading-tight transition-all',
              completed ? 'line-through text-white/25' : 'text-white/85',
            )}
          >
            {challenge.title}
          </span>
        </div>

        <p
          className={clsx(
            'text-xs mt-1 leading-relaxed transition-all',
            completed ? 'text-white/20' : 'text-white/45',
          )}
        >
          {challenge.description}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <span
            className={clsx(
              'text-[10px] font-semibold uppercase tracking-wide',
              completed ? 'text-emerald-400/70' : (CATEGORY_COLOR[challenge.category] ?? 'text-white/30'),
            )}
          >
            {completed ? '✓ Done' : `+${challenge.points} pts`}
          </span>

          {!completed && challenge.gameId && onGameClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGameClick();
              }}
              className="text-[10px] text-white/30 hover:text-purple-400 transition-colors underline underline-offset-2"
            >
              Open game →
            </button>
          )}

          {!completed && (
            <span className="text-[10px] text-white/20 italic truncate">
              {challenge.reward}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DailyChallengesCard({ games, userId, onOpenGame }: DailyChallengesCardProps) {
  const uid = userId || 'local-user';
  const challenges = useMemo(() => generateDailyChallenges(games), [games]);

  const [completedIds, setCompletedIds] = useState<string[]>(() => getDailyData(uid).completedIds);
  const [streak, setStreak] = useState(() => getChallengeStreak(uid));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-challenges-collapsed') === 'true';
  });
  const [justCompleted, setJustCompleted] = useState(false);

  const completedCount = useMemo(
    () => completedIds.filter(id => challenges.some(c => c.id === id)).length,
    [completedIds, challenges],
  );
  const allDone = completedCount >= challenges.length && challenges.length > 0;

  // Track "just completed all" for the celebration moment
  useEffect(() => {
    if (allDone) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 3000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  if (games.length === 0 || challenges.length === 0) return null;

  const handleToggle = (id: string) => {
    const nowDone = !completedIds.includes(id);
    toggleChallengeComplete(uid, id, nowDone);
    const updated = getDailyData(uid).completedIds;
    setCompletedIds(updated);
    setStreak(getChallengeStreak(uid));
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ga-challenges-collapsed', String(next));
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header row */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <Target size={14} className="text-purple-400 shrink-0" />

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white/70">Daily Challenges</span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-orange-400 font-medium shrink-0">
              <Flame size={10} />
              {streak}d streak
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allDone ? (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
              <Trophy size={9} /> All done!
            </span>
          ) : (
            <span className="text-[10px] text-white/30 tabular-nums">
              {completedCount}/{challenges.length}
            </span>
          )}
          {collapsed
            ? <ChevronDown size={14} className="text-white/20" />
            : <ChevronUp size={14} className="text-white/20" />
          }
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-[2px] mx-4 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: challenges.length > 0 ? `${(completedCount / challenges.length) * 100}%` : '0%',
            background: allDone
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #7c3aed, #a855f7)',
          }}
        />
      </div>

      {/* Challenge list */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-2 space-y-2">
          {allDone && justCompleted ? (
            /* Celebration flash */
            <div className="text-center py-4 animate-in fade-in duration-300">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-bold text-emerald-400">Perfect Day!</p>
              <p className="text-xs text-white/30 mt-1">All 3 challenges done. See you tomorrow.</p>
              {streak > 0 && (
                <p className="text-[10px] text-orange-400/70 mt-1 flex items-center justify-center gap-1">
                  <Flame size={10} /> {streak}-day streak
                </p>
              )}
            </div>
          ) : (
            challenges.map(challenge => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                completed={completedIds.includes(challenge.id)}
                onToggle={() => handleToggle(challenge.id)}
                onGameClick={
                  challenge.gameId
                    ? () => onOpenGame?.(challenge.gameId!)
                    : undefined
                }
              />
            ))
          )}

          {/* Points tally */}
          {completedCount > 0 && !allDone && (
            <div className="flex items-center justify-end gap-1 px-1 pt-0.5">
              <Zap size={10} className="text-purple-400/60" />
              <span className="text-[10px] text-white/20">
                {challenges
                  .filter(c => completedIds.includes(c.id))
                  .reduce((s, c) => s + c.points, 0)}{' '}
                pts earned today
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
