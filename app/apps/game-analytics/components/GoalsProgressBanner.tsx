'use client';

import { useMemo, ReactNode } from 'react';
import { Target, ChevronRight, Trophy, DollarSign, Clock, Flame, Layers, Sparkles } from 'lucide-react';
import { Game, GamingGoal, GoalType } from '../lib/types';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import { parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

function calculateGoalProgress(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  switch (goal.type) {
    case 'completion':
      return games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        return parseLocalDate(g.endDate) >= start && parseLocalDate(g.endDate) <= now;
      }).length;

    case 'spending':
      return games
        .filter(g => {
          if (g.status === 'Wishlist' || !g.datePurchased) return false;
          return parseLocalDate(g.datePurchased) >= start && parseLocalDate(g.datePurchased) <= now;
        })
        .reduce((sum, g) => sum + g.price, 0);

    case 'hours':
      return games.reduce((total, g) => {
        const logHours = (g.playLogs || [])
          .filter(log => {
            const logDate = parseLocalDate(log.date);
            return logDate >= start && logDate <= now;
          })
          .reduce((sum, log) => sum + log.hours, 0);
        return total + logHours;
      }, 0);

    case 'genre_variety': {
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        const hasSession = (g.playLogs || []).some(l => {
          const ld = parseLocalDate(l.date);
          return ld >= start && ld <= now;
        });
        if (hasSession) genres.add(g.genre);
      });
      return genres.size;
    }

    case 'backlog': {
      return games.filter(g => {
        if (g.status === 'Wishlist' || !g.startDate) return false;
        const sd = parseLocalDate(g.startDate);
        return sd >= start && sd <= now;
      }).length;
    }

    case 'custom':
      return goal.currentValue;

    default:
      return 0;
  }
}

const GOAL_TYPE_ICON: Record<GoalType, ReactNode> = {
  completion: <Trophy size={11} />,
  spending: <DollarSign size={11} />,
  hours: <Clock size={11} />,
  genre_variety: <Layers size={11} />,
  backlog: <Flame size={11} />,
  custom: <Sparkles size={11} />,
};

const GOAL_TYPE_COLOR: Record<GoalType, string> = {
  completion: 'text-emerald-400',
  spending: 'text-red-400',
  hours: 'text-blue-400',
  genre_variety: 'text-purple-400',
  backlog: 'text-yellow-400',
  custom: 'text-cyan-400',
};

const GOAL_TYPE_BAR: Record<GoalType, string> = {
  completion: 'bg-emerald-500',
  spending: 'bg-red-500',
  hours: 'bg-blue-500',
  genre_variety: 'bg-purple-500',
  backlog: 'bg-yellow-500',
  custom: 'bg-cyan-500',
};

interface GoalsProgressBannerProps {
  games: Game[];
  onGoToStats: () => void;
}

export function GoalsProgressBanner({ games, onGoToStats }: GoalsProgressBannerProps) {
  const { user } = useAuthContext();
  const { goals } = useGoals(user?.uid ?? null);

  const activeGoals = useMemo(
    () => goals.filter(g => g.status === 'active'),
    [goals]
  );

  const goalsWithProgress = useMemo(
    () =>
      activeGoals.slice(0, 2).map(goal => {
        const current = calculateGoalProgress(goal, games);
        const percent =
          goal.targetValue > 0 ? Math.min((current / goal.targetValue) * 100, 100) : 0;
        const daysLeft = Math.ceil(
          (parseLocalDate(goal.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        const isSpending = goal.type === 'spending';
        const isGood = isSpending ? current <= goal.targetValue : percent >= 50;
        return { ...goal, current, percent, daysLeft, isSpending, isGood };
      }),
    [activeGoals, games]
  );

  if (goalsWithProgress.length === 0) return null;

  return (
    <button
      onClick={onGoToStats}
      className="w-full mb-3 p-3 bg-white/[0.025] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all text-left group"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-cyan-400" />
          <span className="text-[11px] font-medium text-white/60">
            {activeGoals.length === 1 ? '1 active goal' : `${activeGoals.length} active goals`}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-white/25 group-hover:text-white/50 transition-colors">
          <span className="text-[10px]">Manage</span>
          <ChevronRight size={11} />
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-1.5">
        {goalsWithProgress.map(goal => (
          <div key={goal.id}>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={clsx('shrink-0', GOAL_TYPE_COLOR[goal.type])}>
                  {GOAL_TYPE_ICON[goal.type]}
                </span>
                <span className="text-[11px] text-white/50 truncate">{goal.title}</span>
              </div>
              <span className={clsx(
                'text-[10px] font-semibold tabular-nums shrink-0 ml-2',
                goal.percent >= 100
                  ? 'text-emerald-400'
                  : goal.daysLeft < 3
                    ? 'text-red-400'
                    : 'text-white/40'
              )}>
                {goal.isSpending
                  ? `$${Math.round(goal.current)} / $${goal.targetValue}`
                  : `${goal.percent.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  goal.percent >= 100 ? 'bg-emerald-500' : GOAL_TYPE_BAR[goal.type]
                )}
                style={{ width: `${Math.min(goal.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
        {activeGoals.length > 2 && (
          <p className="text-[10px] text-white/25 pt-0.5">
            +{activeGoals.length - 2} more goal{activeGoals.length - 2 > 1 ? 's' : ''} in Stats
          </p>
        )}
      </div>
    </button>
  );
}
