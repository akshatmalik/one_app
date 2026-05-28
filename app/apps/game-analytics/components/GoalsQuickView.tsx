'use client';

import { useMemo } from 'react';
import { Target, ChevronRight, Plus, Trophy, Clock, DollarSign, Flame, Layers, Sparkles } from 'lucide-react';
import { Game, GamingGoal, GoalType } from '../lib/types';
import { getTotalHours, parseLocalDate } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

interface GoalsQuickViewProps {
  games: Game[];
  onNavigateToGoals: () => void;
}

const TYPE_ICON: Record<GoalType, React.ReactNode> = {
  completion: <Trophy size={11} />,
  spending:   <DollarSign size={11} />,
  hours:      <Clock size={11} />,
  genre_variety: <Layers size={11} />,
  backlog:    <Flame size={11} />,
  custom:     <Sparkles size={11} />,
};

const TYPE_COLOR: Record<GoalType, string> = {
  completion:   'bg-emerald-500',
  spending:     'bg-red-500',
  hours:        'bg-blue-500',
  genre_variety:'bg-purple-500',
  backlog:      'bg-yellow-500',
  custom:       'bg-cyan-500',
};

const TYPE_TEXT: Record<GoalType, string> = {
  completion:   'text-emerald-400',
  spending:     'text-red-400',
  hours:        'text-blue-400',
  genre_variety:'text-purple-400',
  backlog:      'text-yellow-400',
  custom:       'text-cyan-400',
};

function calculateGoalProgress(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  switch (goal.type) {
    case 'completion':
      return games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        const end = parseLocalDate(g.endDate);
        return end >= start && end <= now;
      }).length;

    case 'spending':
      return games
        .filter(g => {
          if (g.status === 'Wishlist' || !g.datePurchased) return false;
          const purchaseDate = parseLocalDate(g.datePurchased);
          return purchaseDate >= start && purchaseDate <= now;
        })
        .reduce((sum, g) => sum + g.price, 0);

    case 'hours':
      return games.reduce((total, g) => {
        return total + (g.playLogs || [])
          .filter(log => {
            const logDate = parseLocalDate(log.date);
            return logDate >= start && logDate <= now;
          })
          .reduce((s, log) => s + log.hours, 0);
      }, 0);

    case 'genre_variety': {
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        if ((g.playLogs || []).some(log => {
          const logDate = parseLocalDate(log.date);
          return logDate >= start && logDate <= now;
        })) {
          genres.add(g.genre);
        }
      });
      return genres.size;
    }

    case 'backlog':
      return games.filter(g => {
        if (!g.startDate) return false;
        const started = parseLocalDate(g.startDate);
        return started >= start && started <= now;
      }).length;

    case 'custom':
    default:
      return goal.currentValue;
  }
}

function getDaysRemaining(endDate: string): number {
  const end = parseLocalDate(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatValue(goal: GamingGoal, value: number): string {
  if (goal.type === 'spending') return `$${value.toFixed(0)}`;
  if (value % 1 === 0) return value.toFixed(0);
  return value.toFixed(1);
}

export function GoalsQuickView({ games, onNavigateToGoals }: GoalsQuickViewProps) {
  const { user } = useAuthContext();
  const { goals, loading } = useGoals(user?.uid ?? null);

  const activeGoals = useMemo(() =>
    goals.filter(g => g.status === 'active'),
    [goals],
  );

  const goalsWithProgress = useMemo(() =>
    activeGoals.map(goal => {
      const current = calculateGoalProgress(goal, games);
      const percent = goal.targetValue > 0
        ? Math.min((current / goal.targetValue) * 100, 100)
        : 0;
      const daysRemaining = getDaysRemaining(goal.endDate);
      return { ...goal, current, percent, daysRemaining };
    }).sort((a, b) => {
      // Prioritise: soonest deadline, then highest progress
      if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
      return b.percent - a.percent;
    }),
    [activeGoals, games],
  );

  if (loading || games.length === 0) return null;

  // ── No active goals ────────────────────────────────────────────────────────
  if (goalsWithProgress.length === 0) {
    return (
      <button
        onClick={onNavigateToGoals}
        className="w-full flex items-center gap-3 px-4 py-3 mb-4 bg-white/[0.02] border border-white/5 rounded-xl text-left hover:bg-white/[0.04] hover:border-white/10 transition-all group"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/15 transition-colors">
          <Target size={15} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">Set a gaming goal</p>
          <p className="text-[11px] text-white/25">Track completions, hours, spending &amp; more</p>
        </div>
        <Plus size={14} className="text-white/20 group-hover:text-cyan-400 transition-colors shrink-0" />
      </button>
    );
  }

  // ── Active goals ───────────────────────────────────────────────────────────
  const displayGoals = goalsWithProgress.slice(0, 2);

  return (
    <div className="mb-4">
      <button
        onClick={onNavigateToGoals}
        className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] hover:border-white/10 transition-all group"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Target size={13} className="text-cyan-400" />
            <span className="text-[12px] font-medium text-white/60 group-hover:text-white/80 transition-colors">
              Gaming Goals
            </span>
            <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">
              {activeGoals.length}
            </span>
          </div>
          <ChevronRight size={13} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>

        {/* Goal bars */}
        <div className="space-y-2">
          {displayGoals.map(goal => {
            const isOverdue = goal.daysRemaining < 0;
            const isComplete = goal.current >= goal.targetValue;
            const isSpending = goal.type === 'spending';

            const spendOk = isSpending && goal.current <= goal.targetValue;
            const progressColor =
              isComplete && !isSpending ? 'bg-emerald-500' :
              isComplete && isSpending  ? 'bg-red-500' :
              spendOk                  ? 'bg-emerald-500' :
              TYPE_COLOR[goal.type];

            const labelColor =
              isComplete && !isSpending ? 'text-emerald-400' :
              isComplete && isSpending  ? 'text-red-400' :
              spendOk                  ? 'text-emerald-400' :
              TYPE_TEXT[goal.type];

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={clsx('shrink-0', labelColor)}>
                      {TYPE_ICON[goal.type]}
                    </span>
                    <span className="text-[11px] text-white/60 truncate">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={clsx('text-[11px] font-medium tabular-nums', labelColor)}>
                      {formatValue(goal, goal.current)}/{goal.type === 'spending' ? '$' : ''}{goal.targetValue}
                    </span>
                    <span className={clsx(
                      'text-[10px]',
                      isOverdue ? 'text-red-400' : 'text-white/25',
                    )}>
                      {isOverdue
                        ? `${Math.abs(goal.daysRemaining)}d over`
                        : goal.daysRemaining === 0
                          ? 'due today'
                          : `${goal.daysRemaining}d`}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-500', progressColor)}
                    style={{ width: `${Math.min(goal.percent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Overflow hint */}
          {goalsWithProgress.length > 2 && (
            <p className="text-[10px] text-white/25 text-center pt-0.5">
              +{goalsWithProgress.length - 2} more goal{goalsWithProgress.length - 2 > 1 ? 's' : ''} — tap to see all
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
