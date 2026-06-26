'use client';

import { WeeklyPlanEntry } from './calculations';

export interface PlanEntryState {
  done: boolean;
  actualHours?: number;
}

export interface StoredWeeklyPlan {
  weekStart: string; // YYYY-MM-DD, Monday
  weekEnd: string;   // YYYY-MM-DD, Sunday
  weeklyHoursBudget: number;
  entries: WeeklyPlanEntry[];
  entryState: Record<string, PlanEntryState>; // keyed by entryKey()
  generatedAt: string;
}

export interface WeeklyPlanHistoryItem {
  weekStart: string;
  plannedHours: number;
  actualHours: number;
  adherence: number; // 0-100
}

const MAX_HISTORY = 26;

function keyFor(userId: string | null): string {
  return `ga-weekly-plan-${userId || 'local'}`;
}

function historyKeyFor(userId: string | null): string {
  return `ga-weekly-plan-history-${userId || 'local'}`;
}

export function entryKey(entry: { date: string; gameId: string }): string {
  return `${entry.date}__${entry.gameId}`;
}

export function loadWeeklyPlan(userId: string | null): StoredWeeklyPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as StoredWeeklyPlan) : null;
  } catch {
    return null;
  }
}

export function saveWeeklyPlan(userId: string | null, plan: StoredWeeklyPlan): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(plan));
  } catch {
    // ignore quota/storage errors — planning data is non-critical
  }
}

export function clearWeeklyPlan(userId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

export function loadWeeklyPlanHistory(userId: string | null): WeeklyPlanHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(historyKeyFor(userId));
    return raw ? (JSON.parse(raw) as WeeklyPlanHistoryItem[]) : [];
  } catch {
    return [];
  }
}

/** Archives a past week's adherence into history. No-ops if that week was already archived. */
export function archivePastWeek(userId: string | null, plan: StoredWeeklyPlan): void {
  if (typeof window === 'undefined') return;
  try {
    const history = loadWeeklyPlanHistory(userId);
    if (history.some(h => h.weekStart === plan.weekStart)) return;

    const planned = plan.entries.reduce((s, e) => s + e.plannedHours, 0);
    const actual = plan.entries.reduce((s, e) => {
      const state = plan.entryState[entryKey(e)];
      return s + (state?.done ? (state.actualHours ?? e.plannedHours) : 0);
    }, 0);
    const adherence = planned > 0 ? Math.round((actual / planned) * 100) : 0;

    history.unshift({
      weekStart: plan.weekStart,
      plannedHours: Math.round(planned * 10) / 10,
      actualHours: Math.round(actual * 10) / 10,
      adherence,
    });
    localStorage.setItem(historyKeyFor(userId), JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}
