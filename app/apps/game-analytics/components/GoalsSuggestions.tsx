'use client';

import { useMemo, useState } from 'react';
import { Lightbulb, Plus, Check, Loader2 } from 'lucide-react';
import { Game } from '../lib/types';
import { getSmartGoalSuggestions, SmartGoalSuggestion } from '../lib/calculations';
import { useGoals } from '../hooks/useGoals';
import { useAuthContext } from '@/lib/AuthContext';
import clsx from 'clsx';

interface GoalsSuggestionsProps {
  games: Game[];
  activeGoalCount: number;
}

export function GoalsSuggestions({ games, activeGoalCount }: GoalsSuggestionsProps) {
  const { user } = useAuthContext();
  const { addGoal } = useGoals(user?.uid ?? null);
  const suggestions = useMemo(() => getSmartGoalSuggestions(games), [games]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  if (suggestions.length === 0 || activeGoalCount >= 5) return null;

  const handleAdd = async (s: SmartGoalSuggestion) => {
    if (added.has(s.id) || adding) return;
    setAdding(s.id);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const endOfYearStr = `${now.getFullYear()}-12-31`;
      await addGoal({
        userId: user?.uid || 'local-user',
        title: s.title,
        description: s.description,
        type: s.type,
        targetValue: s.targetValue,
        currentValue: 0,
        unit: s.unit,
        startDate: s.type === 'spending' ? `${now.getFullYear()}-01-01` : todayStr,
        endDate: endOfYearStr,
        status: 'active',
      });
      setAdded(prev => new Set([...prev, s.id]));
    } catch {
      // ignore — GoalsPanel will show any errors
    } finally {
      setAdding(null);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Lightbulb size={12} className="text-yellow-400" />
        Smart Suggestions — based on your library
      </h4>
      <div className="space-y-2">
        {suggestions.map(s => (
          <div
            key={s.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              added.has(s.id)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10',
            )}
          >
            <span className="text-xl shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/85">{s.title}</div>
              <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{s.description}</div>
            </div>
            <button
              onClick={() => handleAdd(s)}
              disabled={!!adding || added.has(s.id)}
              className={clsx(
                'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                added.has(s.id)
                  ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                  : adding === s.id
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 active:scale-95',
              )}
            >
              {adding === s.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : added.has(s.id) ? (
                <><Check size={12} /> Added</>
              ) : (
                <><Plus size={12} /> Add Goal</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
