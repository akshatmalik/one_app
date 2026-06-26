'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Game } from '../lib/types';
import { generateWeeklyPlan, WeeklyPlanEntry } from '../lib/calculations';
import {
  loadWeeklyPlan, saveWeeklyPlan, clearWeeklyPlan, archivePastWeek,
  loadWeeklyPlanHistory, entryKey, StoredWeeklyPlan, WeeklyPlanHistoryItem,
} from '../lib/weekly-plan-storage';

const DEFAULT_HOURS_BUDGET = 10;

function mondayOfISO(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useWeeklyPlan(userId: string | null, queueGames: Game[], allGames: Game[]) {
  const [plan, setPlan] = useState<StoredWeeklyPlan | null>(null);
  const [history, setHistory] = useState<WeeklyPlanHistoryItem[]>([]);
  const [hoursBudget, setHoursBudget] = useState(DEFAULT_HOURS_BUDGET);

  useEffect(() => {
    const stored = loadWeeklyPlan(userId);
    const currentWeekStart = mondayOfISO(new Date());
    if (stored && stored.weekStart !== currentWeekStart) {
      archivePastWeek(userId, stored);
      setPlan(null);
    } else {
      setPlan(stored);
      if (stored) setHoursBudget(stored.weeklyHoursBudget);
    }
    setHistory(loadWeeklyPlanHistory(userId));
  }, [userId]);

  const generate = useCallback((budget: number) => {
    const { entries, summary } = generateWeeklyPlan(queueGames, allGames, budget, new Date());
    const newPlan: StoredWeeklyPlan = {
      weekStart: summary.weekStart,
      weekEnd: summary.weekEnd,
      weeklyHoursBudget: budget,
      entries,
      entryState: {},
      generatedAt: new Date().toISOString(),
    };
    setPlan(newPlan);
    setHoursBudget(budget);
    saveWeeklyPlan(userId, newPlan);
  }, [userId, queueGames, allGames]);

  const toggleDone = useCallback((entry: WeeklyPlanEntry, actualHours?: number) => {
    setPlan(prev => {
      if (!prev) return prev;
      const key = entryKey(entry);
      const current = prev.entryState[key];
      const updated: StoredWeeklyPlan = {
        ...prev,
        entryState: {
          ...prev.entryState,
          [key]: current?.done ? { done: false } : { done: true, actualHours: actualHours ?? entry.plannedHours },
        },
      };
      saveWeeklyPlan(userId, updated);
      return updated;
    });
  }, [userId]);

  const clearPlan = useCallback(() => {
    setPlan(null);
    clearWeeklyPlan(userId);
  }, [userId]);

  const adherence = useMemo(() => {
    if (!plan || plan.entries.length === 0) return null;
    const planned = plan.entries.reduce((s, e) => s + e.plannedHours, 0);
    const actual = plan.entries.reduce((s, e) => {
      const state = plan.entryState[entryKey(e)];
      return s + (state?.done ? (state.actualHours ?? e.plannedHours) : 0);
    }, 0);
    return planned > 0 ? Math.round((actual / planned) * 100) : 0;
  }, [plan]);

  const lastWeekAdherence = history[0]?.adherence ?? null;

  return { plan, history, hoursBudget, generate, toggleDone, clearPlan, adherence, lastWeekAdherence };
}
