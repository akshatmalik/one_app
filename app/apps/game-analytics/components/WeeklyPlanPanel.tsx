'use client';

import { useState } from 'react';
import { CalendarDays, RefreshCw, CheckCircle2, Circle, Sparkles, TrendingUp, X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { WeeklyPlanEntry } from '../lib/calculations';
import { StoredWeeklyPlan, WeeklyPlanHistoryItem, entryKey } from '../lib/weekly-plan-storage';

interface WeeklyPlanPanelProps {
  plan: StoredWeeklyPlan | null;
  history: WeeklyPlanHistoryItem[];
  hoursBudget: number;
  onGenerate: (budget: number) => void;
  onToggleDone: (entry: WeeklyPlanEntry) => void;
  onClear: () => void;
  adherence: number | null;
  lastWeekAdherence: number | null;
  hasCandidates: boolean;
}

export function WeeklyPlanPanel({
  plan, history, hoursBudget, onGenerate, onToggleDone, onClear, adherence, lastWeekAdherence, hasCandidates,
}: WeeklyPlanPanelProps) {
  const [budgetInput, setBudgetInput] = useState(hoursBudget);
  const [collapsed, setCollapsed] = useState(false);

  if (!hasCandidates && !plan) return null;

  const totalHours = plan ? plan.entries.reduce((s, e) => s + e.plannedHours, 0) : 0;

  return (
    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarDays size={18} className="text-emerald-400 shrink-0" />
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-white">This Week&apos;s Plan</h3>
            <p className="text-[11px] text-white/40 truncate">
              {plan
                ? `${plan.entries.length} session${plan.entries.length !== 1 ? 's' : ''} · ${totalHours.toFixed(1)}h planned`
                : 'Auto-generate a day-by-day plan from your queue'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastWeekAdherence != null && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/40">
              <TrendingUp size={12} />
              {lastWeekAdherence}% last week
            </span>
          )}
          <ChevronDown size={16} className={clsx('text-white/30 transition-transform', !collapsed && 'rotate-180')} />
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {!plan ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range" min="1" max="40" step="0.5"
                  value={budgetInput}
                  onChange={e => setBudgetInput(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-500 h-1"
                  aria-label="Weekly hours budget"
                />
                <span className="text-xs font-medium text-white/70 w-16 text-right shrink-0">{budgetInput}h/wk</span>
              </div>
              <button
                onClick={() => onGenerate(budgetInput)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all shrink-0"
              >
                <Sparkles size={14} />
                Plan My Week
              </button>
            </div>
          ) : plan.entries.length === 0 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/40">Couldn&apos;t fit anything in — try a bigger weekly budget.</p>
              <button
                onClick={onClear}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-white/40 hover:bg-white/10 transition-all shrink-0"
              >
                <X size={12} />
                Dismiss
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {plan.entries.map(entry => {
                  const key = entryKey(entry);
                  const state = plan.entryState[key];
                  return (
                    <div
                      key={key}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border transition-all',
                        state?.done ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'
                      )}
                    >
                      <button onClick={() => onToggleDone(entry)} className="shrink-0" aria-label="Mark session done">
                        {state?.done
                          ? <CheckCircle2 size={18} className="text-emerald-400" />
                          : <Circle size={18} className="text-white/25" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-white/35 uppercase w-7 shrink-0">{entry.day}</span>
                          <span className={clsx('text-sm font-medium truncate', state?.done ? 'text-white/50 line-through' : 'text-white/85')}>
                            {entry.gameName}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/35 truncate">{entry.reason}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-300/80 shrink-0">{entry.plannedHours}h</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-white/40">
                  {adherence != null && `${adherence}% of this week's plan done`}
                  {adherence != null && history.length > 0 && lastWeekAdherence != null && (
                    <span className="sm:hidden"> · {lastWeekAdherence}% last week</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onGenerate(hoursBudget)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-all"
                  >
                    <RefreshCw size={12} />
                    Regenerate
                  </button>
                  <button
                    onClick={onClear}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
