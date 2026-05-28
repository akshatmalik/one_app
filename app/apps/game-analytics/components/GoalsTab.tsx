'use client';

import { useState, useMemo } from 'react';
import { Lightbulb, Plus, Check, Target } from 'lucide-react';
import { Game } from '../lib/types';
import { GoalSuggestion, getSmartGoalSuggestions } from '../lib/calculations';
import { GoalsPanel } from './GoalsPanel';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

interface GoalsTabProps {
  games: Game[];
}

const COLOR_CLASSES: Record<string, { pill: string; dot: string }> = {
  emerald: { pill: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' },
  blue:    { pill: 'bg-blue-500/15 text-blue-400',       dot: 'bg-blue-500' },
  red:     { pill: 'bg-red-500/15 text-red-400',         dot: 'bg-red-500' },
  purple:  { pill: 'bg-purple-500/15 text-purple-400',   dot: 'bg-purple-500' },
  yellow:  { pill: 'bg-yellow-500/15 text-yellow-400',   dot: 'bg-yellow-500' },
  amber:   { pill: 'bg-amber-500/15 text-amber-400',     dot: 'bg-amber-500' },
  cyan:    { pill: 'bg-cyan-500/15 text-cyan-400',       dot: 'bg-cyan-500' },
};

export function GoalsTab({ games }: GoalsTabProps) {
  const { user } = useAuthContext();
  const { goals, addGoal } = useGoals(user?.uid ?? null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  // Incrementing this key forces GoalsPanel to remount and re-fetch after a
  // suggestion is added, so the new goal shows immediately.
  const [goalListKey, setGoalListKey] = useState(0);

  const suggestions = useMemo(() => getSmartGoalSuggestions(games), [games]);

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const completedThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return goals.filter(g => g.status === 'completed' && new Date(g.updatedAt).getFullYear() === year).length;
  }, [goals]);

  // Suggestions that match an existing goal title are considered already added
  const existingTitles = useMemo(() => new Set(goals.map(g => g.title)), [goals]);

  const handleAddSuggestion = async (s: GoalSuggestion) => {
    if (adding) return;
    setAdding(s.id);
    try {
      await addGoal({
        userId: user?.uid ?? '',
        title: s.title,
        description: s.description,
        type: s.type,
        targetValue: s.targetValue,
        currentValue: 0,
        unit: s.unit,
        startDate: s.startDate,
        endDate: s.endDate,
        status: 'active',
      });
      setAddedIds(prev => new Set([...prev, s.id]));
      setGoalListKey(k => k + 1);
    } catch {
      // Silent failure — goal storage error is non-critical
    } finally {
      setAdding(null);
    }
  };

  const nearestDeadline = useMemo(() => {
    const active = goals.filter(g => g.status === 'active' && g.endDate);
    if (active.length === 0) return null;
    return active.sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
  }, [goals]);

  const daysUntilDeadline = nearestDeadline
    ? Math.ceil(
        (new Date(nearestDeadline.endDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="pb-8 space-y-5">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 text-center">
          <div className="text-2xl font-bold text-white">{activeGoals.length}</div>
          <div className="text-[10px] text-white/35 mt-1 leading-tight">Active</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 text-center">
          <div className="text-2xl font-bold text-emerald-400">{completedThisYear}</div>
          <div className="text-[10px] text-white/35 mt-1 leading-tight">Done {new Date().getFullYear()}</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 text-center">
          {daysUntilDeadline !== null ? (
            <>
              <div className={clsx(
                'text-2xl font-bold',
                daysUntilDeadline <= 3 ? 'text-red-400' :
                daysUntilDeadline <= 7 ? 'text-amber-400' : 'text-white'
              )}>
                {daysUntilDeadline < 0 ? 'Due!' : daysUntilDeadline}
              </div>
              <div className="text-[10px] text-white/35 mt-1 leading-tight">Days left</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-white/20">—</div>
              <div className="text-[10px] text-white/25 mt-1 leading-tight">No deadline</div>
            </>
          )}
        </div>
      </div>

      {/* ── Smart Suggestions ── */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} className="text-amber-400/70" />
            <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">
              Suggested for You
            </span>
            <span className="ml-auto text-[10px] text-white/20">Based on your data</span>
          </div>

          <div className="space-y-2">
            {suggestions.map(s => {
              const isAdded = addedIds.has(s.id) || existingTitles.has(s.title);
              const isAdding = adding === s.id;
              const colors = COLOR_CLASSES[s.color] ?? COLOR_CLASSES.blue;

              return (
                <div
                  key={s.id}
                  className={clsx(
                    'flex items-center gap-3 p-3.5 rounded-xl border transition-colors',
                    isAdded
                      ? 'bg-white/[0.02] border-white/[0.04]'
                      : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.10]'
                  )}
                >
                  {/* Emoji + color dot */}
                  <div className="relative shrink-0">
                    <span className="text-xl leading-none">{s.icon}</span>
                    <span className={clsx('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full', colors.dot)} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      'text-sm font-medium leading-snug',
                      isAdded ? 'text-white/40' : 'text-white/80'
                    )}>
                      {s.title}
                    </div>
                    <div className="text-[11px] text-white/25 mt-0.5 truncate">
                      {s.rationale}
                    </div>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={() => !isAdded && !isAdding && handleAddSuggestion(s)}
                    disabled={isAdded || isAdding}
                    className={clsx(
                      'shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                      isAdded
                        ? `${colors.pill} cursor-default opacity-70`
                        : isAdding
                          ? 'bg-white/[0.04] text-white/20 cursor-wait'
                          : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.13] hover:text-white active:scale-95'
                    )}
                  >
                    {isAdded ? (
                      <><Check size={11} /><span>Added</span></>
                    ) : isAdding ? (
                      <span className="px-1">···</span>
                    ) : (
                      <><Plus size={11} /><span>Add</span></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Goals Panel ── */}
      {/* Key forces a remount (and fresh data fetch) after a suggestion is added */}
      <GoalsPanel key={goalListKey} games={games} />

      {/* Empty-state help if no goals and no library */}
      {games.length === 0 && suggestions.length === 0 && (
        <div className="text-center py-10">
          <Target size={36} className="mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">Add games to unlock personalised goal suggestions</p>
        </div>
      )}
    </div>
  );
}
