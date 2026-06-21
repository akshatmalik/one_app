'use client';

/**
 * Backlog Bracket — a finite, single-elimination "what should I play next"
 * tournament. Unlike the continuous ELO ranking system (useRankings.ts /
 * ranking-storage.ts), this is a one-off decision tool scoped to your
 * unstarted/in-progress backlog: pick a bracket size, get a seeded field,
 * tap a winner each round, crown a champion. Purely a planning aid — like
 * estimator-settings.ts / queue-preferences.ts, it stays device-local in
 * localStorage rather than going through the Hybrid/Firebase repository.
 */

export interface BracketMatch {
  round: number;       // 0 = first round
  slot: number;        // position within the round
  gameAId: string | null;
  gameBId: string | null; // null = gameA had a bye
  winnerId?: string;
}

export interface ActiveBracket {
  id: string;
  createdAt: string;
  size: number;             // 4, 8, or 16
  gameIds: string[];        // the seeded field, in bracket order
  matches: BracketMatch[];  // flattened across all rounds
  currentRound: number;
  championId?: string;
}

export interface BracketHistoryEntry {
  id: string;
  completedAt: string;
  size: number;
  championId: string;
  championName: string;
  runnerUpId?: string;
  runnerUpName?: string;
  fieldIds: string[];
}

const MAX_HISTORY = 25;

const activeKeyFor = (userId: string) => `ga-bracket-active-${userId || 'local-user'}`;
const historyKeyFor = (userId: string) => `ga-bracket-history-${userId || 'local-user'}`;

export function loadActiveBracket(userId: string): ActiveBracket | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(activeKeyFor(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ActiveBracket;
  } catch {
    return null;
  }
}

export function saveActiveBracket(userId: string, bracket: ActiveBracket | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (bracket === null) {
      localStorage.removeItem(activeKeyFor(userId));
    } else {
      localStorage.setItem(activeKeyFor(userId), JSON.stringify(bracket));
    }
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function loadBracketHistory(userId: string): BracketHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(historyKeyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendBracketHistory(userId: string, entry: BracketHistoryEntry): BracketHistoryEntry[] {
  const next = [entry, ...loadBracketHistory(userId)].slice(0, MAX_HISTORY);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(historyKeyFor(userId), JSON.stringify(next));
    } catch {
      /* ignore quota / disabled storage */
    }
  }
  return next;
}
