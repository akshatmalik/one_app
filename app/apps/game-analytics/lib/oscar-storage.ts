/**
 * Oscar Awards user voting storage.
 * Saves user picks per period (week / month / year) to localStorage.
 * Schema: { periodKey: { categoryId: gameId } }
 */

const STORAGE_KEY = 'game-analytics-oscar-votes';

export type OscarPeriodType = 'week' | 'month' | 'year';

export interface OscarVote {
  periodKey: string;        // e.g. "week-2026-08", "month-2026-02", "year-2026"
  periodType: OscarPeriodType;
  categoryId: string;       // e.g. "best_picture", "user_choice"
  gameId: string;
  gameName: string;
  votedAt: string;          // ISO date
}

function loadVotes(): Record<string, OscarVote> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes: Record<string, OscarVote>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

function makeKey(periodKey: string, categoryId: string): string {
  return `${periodKey}::${categoryId}`;
}

export function castOscarVote(
  periodKey: string,
  periodType: OscarPeriodType,
  categoryId: string,
  gameId: string,
  gameName: string,
): void {
  const votes = loadVotes();
  votes[makeKey(periodKey, categoryId)] = {
    periodKey,
    periodType,
    categoryId,
    gameId,
    gameName,
    votedAt: new Date().toISOString(),
  };
  saveVotes(votes);
}

export function getOscarVote(periodKey: string, categoryId: string): OscarVote | null {
  const votes = loadVotes();
  return votes[makeKey(periodKey, categoryId)] ?? null;
}

export function getOscarVotesForPeriod(periodKey: string): OscarVote[] {
  const votes = loadVotes();
  return Object.values(votes).filter(v => v.periodKey === periodKey);
}

export function clearOscarVotes(periodKey: string): void {
  const votes = loadVotes();
  const filtered: Record<string, OscarVote> = {};
  for (const [k, v] of Object.entries(votes)) {
    if (v.periodKey !== periodKey) filtered[k] = v;
  }
  saveVotes(filtered);
}

/** Build a period key for a week (ISO week number) */
export function weekPeriodKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  // Simple ISO week: find Monday of the week
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `week-${year}-${String(weekNo).padStart(2, '0')}`;
}

/** Build a period key for a month */
export function monthPeriodKey(year: number, month: number): string {
  return `month-${year}-${String(month).padStart(2, '0')}`;
}

/** Build a period key for a year */
export function yearPeriodKey(year: number): string {
  return `year-${year}`;
}
