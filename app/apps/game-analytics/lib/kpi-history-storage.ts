'use client';

/**
 * KPI history — a lightweight per-day snapshot log so Stats can show how the
 * library's headline numbers move over time. Device-local planning data, same
 * precedent as quest-storage.ts / queue-preferences.ts: it doesn't change game
 * data, so it stays out of the Hybrid/Firebase repository (every snapshot is
 * just a recomputation of existing live stats, stamped with a date).
 */

export interface KpiSnapshot {
  date: string; // YYYY-MM-DD
  creditScore: number;
  costPerHour: number;
  completionRate: number;
  totalHours: number;
  totalSpent: number;
  librarySize: number;
  avgRating: number;
  activeRate: number;
  // Added so Population Benchmark Mode dimensions can show a trend over time,
  // not just today's snapshot. Optional because snapshots recorded before
  // this field existed won't have it — trend charts simply start later.
  backlogSize?: number;
  hoursPerWeek?: number;
  genreDiversity?: number;
  yearlySpend?: number;
  firstPlayDays?: number;
  sessionLengthHours?: number;
}

const MAX_HISTORY_DAYS = 400;

const keyFor = (userId: string) => `ga-kpi-history-${userId || 'local-user'}`;

interface KpiHistoryStore {
  days: Record<string, KpiSnapshot>;
}

function load(userId: string): KpiHistoryStore {
  if (typeof window === 'undefined') return { days: {} };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw) as Partial<KpiHistoryStore>;
    return { days: parsed.days ?? {} };
  } catch {
    return { days: {} };
  }
}

function save(userId: string, store: KpiHistoryStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(store));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Record (or overwrite) today's KPI snapshot, pruning old entries beyond the cap. */
export function recordKpiSnapshot(userId: string, snapshot: KpiSnapshot): void {
  const store = load(userId);
  store.days[snapshot.date] = snapshot;

  const dates = Object.keys(store.days).sort();
  if (dates.length > MAX_HISTORY_DAYS) {
    const toDrop = dates.slice(0, dates.length - MAX_HISTORY_DAYS);
    toDrop.forEach(d => delete store.days[d]);
  }

  save(userId, store);
}

export function getKpiHistory(userId: string): KpiSnapshot[] {
  const store = load(userId);
  return Object.values(store.days).sort((a, b) => a.date.localeCompare(b.date));
}
