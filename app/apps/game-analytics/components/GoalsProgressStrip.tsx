'use client';

import { useState, useMemo } from 'react';
import { Target, Plus, ChevronRight, Trophy, DollarSign, Clock, Layers, Flame, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Game, GamingGoal, GoalType } from '../lib/types';
import { parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

// Compute current progress value for a goal (mirrors GoalsPanel logic)
function computeGoalCurrent(goal: GamingGoal, games: Game[]): number {
  const start = parseLocalDate(goal.startDate);
  const now = new Date();

  switch (goal.type) {
    case 'completion':
      return games.filter(g => {
        if (g.status !== 'Completed' || !g.endDate) return false;
        const d = parseLocalDate(g.endDate);
        return d >= start && d <= now;
      }).length;

    case 'spending':
      return games
        .filter(g => g.status !== 'Wishlist' && g.datePurchased)
        .filter(g => {
          const d = parseLocalDate(g.datePurchased!);
          return d >= start && d <= now;
        })
        .reduce((s, g) => s + g.price, 0);

    case 'hours':
      return games.reduce((total, g) => {
        const logged = (g.playLogs || [])
          .filter(log => {
            const d = parseLocalDate(log.date);
            return d >= start && d <= now;
          })
          .reduce((s, l) => s + l.hours, 0);
        return total + logged;
      }, 0);

    case 'genre_variety': {
      const genres = new Set<string>();
      games.forEach(g => {
        if (!g.genre) return;
        const active = (g.playLogs || []).some(log => {
          const d = parseLocalDate(log.date);
          return d >= start && d <= now;
        });
        if (active) genres.add(g.genre);
      });
      return genres.size;
    }

    case 'backlog':
      return games.filter(g => {
        if (!g.startDate) return false;
        const d = parseLocalDate(g.startDate);
        return d >= start && d <= now;
      }).length;

    default:
      return goal.currentValue;
  }
}

function getDaysLeft(endDate: string): number {
  const end = parseLocalDate(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const TYPE_ICONS: Record<GoalType, React.ReactNode> = {
  completion:    <Trophy size={11} />,
  spending:      <DollarSign size={11} />,
  hours:         <Clock size={11} />,
  genre_variety: <Layers size={11} />,
  backlog:       <Flame size={11} />,
  custom:        <Sparkles size={11} />,
};

const TYPE_COLORS: Record<GoalType, string> = {
  completion:    '#10b981',
  spending:      '#ef4444',
  hours:         '#3b82f6',
  genre_variety: '#a855f7',
  backlog:       '#f59e0b',
  custom:        '#06b6d4',
};

interface GoalsProgressStripProps {
  games: Game[];
  activeGoals: GamingGoal[];
  onGoToGoals: () => void;
}

export function GoalsProgressStrip({ games, activeGoals, onGoToGoals }: GoalsProgressStripProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-goals-strip-collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') localStorage.setItem('ga-goals-strip-collapsed', String(next));
  };

  const goalsWithProgress = useMemo(() => {
    return activeGoals.map(goal => {
      const current = computeGoalCurrent(goal, games);
      const percent = goal.targetValue > 0 ? Math.min((current / goal.targetValue) * 100, 100) : 0;
      const daysLeft = getDaysLeft(goal.endDate);
      const isComplete = current >= goal.targetValue;
      const isSpending = goal.type === 'spending';
      return { ...goal, current, percent, daysLeft, isComplete, isSpending };
    });
  }, [activeGoals, games]);

  const completedCount = goalsWithProgress.filter(g => g.isComplete && !g.isSpending).length;
  const overallPercent = goalsWithProgress.length > 0
    ? Math.round(goalsWithProgress.reduce((s, g) => s + g.percent, 0) / goalsWithProgress.length)
    : 0;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (activeGoals.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-3 px-3 py-2.5 bg-white/[0.02] border border-dashed border-white/8 rounded-xl">
        <Target size={14} className="text-cyan-400/50 shrink-0" />
        <span className="text-xs text-white/30 flex-1">No active goals — set a challenge to stay motivated.</span>
        <button
          onClick={onGoToGoals}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 rounded-lg text-xs font-medium transition-all"
        >
          <Plus size={11} />
          Add Goal
        </button>
      </div>
    );
  }

  // ── Active goals strip ────────────────────────────────────────────────────
  return (
    <div className="mb-4 bg-white/[0.02] border border-white/8 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <Target size={13} className="text-cyan-400 shrink-0" />
        <span className="text-xs font-semibold text-white/70">Goals</span>

        {/* Pill: active count */}
        <span className="text-[10px] text-cyan-300 bg-cyan-500/15 px-1.5 py-0.5 rounded-full shrink-0">
          {activeGoals.length} active
        </span>

        {/* Overall progress */}
        <span className="text-[10px] text-white/30 shrink-0 hidden sm:inline">
          {overallPercent}% avg · {completedCount} done
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Manage link */}
        <span
          role="button"
          onClick={e => { e.stopPropagation(); onGoToGoals(); }}
          className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-0.5 shrink-0"
        >
          Manage <ChevronRight size={10} />
        </span>

        {/* Collapse icon */}
        {collapsed
          ? <ChevronDown size={13} className="text-white/20 shrink-0" />
          : <ChevronUp size={13} className="text-white/20 shrink-0" />
        }
      </button>

      {/* Goal progress bars */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2.5">
          {goalsWithProgress.map(goal => {
            const color = TYPE_COLORS[goal.type];
            const isOverdue = goal.daysLeft < 0;
            const barColor = goal.isComplete && !goal.isSpending ? '#10b981'
              : goal.isComplete && goal.isSpending ? '#ef4444'
              : color;

            return (
              <div key={goal.id}>
                {/* Label row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span style={{ color }} className="shrink-0">{TYPE_ICONS[goal.type]}</span>
                    <span className="text-xs text-white/60 truncate max-w-[140px] sm:max-w-none">{goal.title}</span>
                    {goal.isComplete && !goal.isSpending && (
                      <span className="shrink-0 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full leading-none">
                        Done!
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-white/50 font-mono">
                      {goal.type === 'spending' ? `$${goal.current.toFixed(0)}` : goal.current.toFixed(goal.current % 1 === 0 ? 0 : 1)}
                      <span className="text-white/25">
                        /{goal.type === 'spending' ? `$${goal.targetValue}` : `${goal.targetValue} ${goal.unit}`}
                      </span>
                    </span>
                    <span className={clsx(
                      'text-[10px] tabular-nums shrink-0',
                      isOverdue ? 'text-red-400' : 'text-white/25',
                    )}>
                      {isOverdue
                        ? `${Math.abs(goal.daysLeft)}d over`
                        : goal.daysLeft === 0 ? 'Due today'
                        : `${goal.daysLeft}d`}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${goal.percent}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
