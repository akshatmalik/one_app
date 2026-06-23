'use client';

/**
 * Daily Quests streak history — a lightweight per-day completion log so the
 * Daily Quests panel can show a streak once a day's quest set is no longer
 * "today's" quests. Device-local planning data, same precedent as
 * queue-preferences.ts / estimator-settings.ts: it doesn't change game data,
 * so it stays out of the Hybrid/Firebase repository (quest completion itself
 * is always re-derived live from playLogs — this store only remembers the
 * outcome after the day has passed).
 */

export interface QuestDayRecord {
  date: string; // YYYY-MM-DD
  completedCount: number;
  totalCount: number;
}

const MAX_HISTORY_DAYS = 120;

const keyFor = (userId: string) => `ga-daily-quests-${userId || 'local-user'}`;

interface QuestHistoryStore {
  days: Record<string, QuestDayRecord>;
}

function load(userId: string): QuestHistoryStore {
  if (typeof window === 'undefined') return { days: {} };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw) as Partial<QuestHistoryStore>;
    return { days: parsed.days ?? {} };
  } catch {
    return { days: {} };
  }
}

function save(userId: string, store: QuestHistoryStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(store));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Record (or update) a day's quest completion progress, pruning old entries. */
export function recordQuestDay(userId: string, record: QuestDayRecord): void {
  const store = load(userId);
  store.days[record.date] = record;

  const dates = Object.keys(store.days).sort();
  if (dates.length > MAX_HISTORY_DAYS) {
    const toDrop = dates.slice(0, dates.length - MAX_HISTORY_DAYS);
    toDrop.forEach(d => delete store.days[d]);
  }

  save(userId, store);
}

export function getQuestHistory(userId: string): QuestDayRecord[] {
  const store = load(userId);
  return Object.values(store.days).sort((a, b) => a.date.localeCompare(b.date));
}

/** Consecutive "perfect" days (completedCount === totalCount, totalCount > 0), counting back from today. */
export function getQuestStreak(userId: string, todayStr: string): number {
  const history = getQuestHistory(userId);
  const byDate = new Map(history.map(r => [r.date, r]));
  const isPerfect = (r?: QuestDayRecord) => !!r && r.totalCount > 0 && r.completedCount === r.totalCount;

  let streak = 0;
  const cursor = new Date(`${todayStr}T00:00:00`);

  if (isPerfect(byDate.get(todayStr))) streak++;
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const dStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const record = byDate.get(dStr);
    if (!isPerfect(record)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
