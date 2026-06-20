'use client';

/**
 * Time Machine — periodic local snapshots of the whole game library.
 *
 * Stored entirely in localStorage (same precedent as queue-preferences.ts /
 * estimator-settings.ts) since this is a personal safety net against
 * accidental deletes, bad bulk imports, or a wiped browser profile — not a
 * sync mechanism, so it deliberately stays out of the Hybrid/Firebase
 * repository and doesn't need a Firestore rule.
 */

import { Game } from './types';

export type SnapshotReason = 'auto' | 'manual';

export interface LibrarySnapshot {
  id: string;
  createdAt: string;
  reason: SnapshotReason;
  gameCount: number;
  totalSpent: number;
  totalHours: number;
  games: Game[];
}

export interface FieldChange {
  field: keyof Game;
  label: string;
  from: string;
  to: string;
}

export interface ModifiedGame {
  id: string;
  name: string;
  changes: FieldChange[];
}

export interface SnapshotDiff {
  added: Game[]; // exist now, didn't exist in the snapshot
  removed: Game[]; // existed in the snapshot, don't exist now
  modified: ModifiedGame[];
  unchanged: number;
}

export interface RevertChange {
  id: string;
  name: string;
  changes: Partial<Game>;
}

export interface RestorePlan {
  toReAdd: Game[]; // removed games to bring back
  toRevert: RevertChange[]; // modified games to revert field-by-field
  toRemove: string[]; // ids to delete — only populated in "exact" mode
}

const KEY = (userId: string) => `ga-library-snapshots-${userId || 'local-user'}`;
const MAX_SNAPSHOTS = 20;
const AUTO_SNAPSHOT_MIN_GAP_MS = 12 * 60 * 60 * 1000; // 12h

function computeTotals(games: Game[]) {
  const totalSpent = games.reduce(
    (sum, g) => sum + (g.status !== 'Wishlist' && !g.acquiredFree ? g.price || 0 : 0),
    0
  );
  const totalHours = games.reduce((sum, g) => sum + (g.hours || 0), 0);
  return { gameCount: games.length, totalSpent, totalHours };
}

export function getSnapshots(userId: string): LibrarySnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibrarySnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(userId: string, snapshots: LibrarySnapshot[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(snapshots));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Drops the oldest auto snapshots first; only trims manual ones if still over the cap. */
function prune(snapshots: LibrarySnapshot[]): LibrarySnapshot[] {
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots;
  const sorted = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const manual = sorted.filter(s => s.reason === 'manual');
  const auto = sorted.filter(s => s.reason === 'auto');
  const keepAutoCount = Math.max(0, MAX_SNAPSHOTS - manual.length);
  const merged = [...manual, ...auto.slice(0, keepAutoCount)];
  return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_SNAPSHOTS);
}

export function saveSnapshot(userId: string, games: Game[], reason: SnapshotReason): LibrarySnapshot {
  const snapshot: LibrarySnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    reason,
    games: games.map(g => ({ ...g, playLogs: g.playLogs ? [...g.playLogs] : g.playLogs })),
    ...computeTotals(games),
  };
  const next = prune([snapshot, ...getSnapshots(userId)]);
  persist(userId, next);
  return snapshot;
}

export function deleteSnapshot(userId: string, id: string): void {
  persist(userId, getSnapshots(userId).filter(s => s.id !== id));
}

/** Saves an auto snapshot only if enough time has passed AND the library actually changed. */
export function maybeAutoSnapshot(userId: string, games: Game[]): LibrarySnapshot | null {
  if (games.length === 0) return null;
  const existing = getSnapshots(userId);
  const lastAuto = existing.find(s => s.reason === 'auto');
  const totals = computeTotals(games);
  if (lastAuto) {
    const age = Date.now() - new Date(lastAuto.createdAt).getTime();
    const unchanged =
      lastAuto.gameCount === totals.gameCount &&
      Math.abs(lastAuto.totalSpent - totals.totalSpent) < 0.01 &&
      Math.abs(lastAuto.totalHours - totals.totalHours) < 0.05;
    if (age < AUTO_SNAPSHOT_MIN_GAP_MS || unchanged) return null;
  }
  return saveSnapshot(userId, games, 'auto');
}

// ── Diffing ──────────────────────────────────────────────────────────

const TRACKED_FIELDS: { key: keyof Game; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'hours', label: 'Hours' },
  { key: 'rating', label: 'Rating' },
  { key: 'status', label: 'Status' },
  { key: 'platform', label: 'Platform' },
  { key: 'genre', label: 'Genre' },
  { key: 'notes', label: 'Notes' },
  { key: 'review', label: 'Review' },
  { key: 'queuePosition', label: 'Queue position' },
];

function formatFieldValue(key: keyof Game, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (key === 'price') return `$${Number(value).toFixed(2)}`;
  if (key === 'hours') return `${Number(value).toFixed(1)}h`;
  if (key === 'rating') return `${Number(value)}/10`;
  return String(value);
}

export function diffSnapshot(snapshotGames: Game[], currentGames: Game[]): SnapshotDiff {
  const currentMap = new Map(currentGames.map(g => [g.id, g]));
  const snapIds = new Set(snapshotGames.map(g => g.id));

  const added = currentGames.filter(g => !snapIds.has(g.id));
  const removed = snapshotGames.filter(g => !currentMap.has(g.id));

  const modified: ModifiedGame[] = [];
  let unchanged = 0;
  for (const snapGame of snapshotGames) {
    const currentGame = currentMap.get(snapGame.id);
    if (!currentGame) continue;
    const changes: FieldChange[] = [];
    for (const { key, label } of TRACKED_FIELDS) {
      if (snapGame[key] !== currentGame[key]) {
        changes.push({ field: key, label, from: formatFieldValue(key, snapGame[key]), to: formatFieldValue(key, currentGame[key]) });
      }
    }
    const snapLogCount = snapGame.playLogs?.length ?? 0;
    const currentLogCount = currentGame.playLogs?.length ?? 0;
    if (snapLogCount !== currentLogCount) {
      changes.push({ field: 'playLogs', label: 'Sessions logged', from: `${snapLogCount}`, to: `${currentLogCount}` });
    }
    if (changes.length > 0) {
      modified.push({ id: snapGame.id, name: currentGame.name, changes });
    } else {
      unchanged++;
    }
  }

  return { added, removed, modified, unchanged };
}

// ── Restore ──────────────────────────────────────────────────────────

/** Strips fields that can't be passed back through addGame() (id/userId/timestamps are server-assigned). */
export function toCreatePayload(game: Game): Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    name: game.name,
    price: game.price,
    hours: game.hours,
    expectedHours: game.expectedHours,
    rating: game.rating,
    status: game.status,
    platform: game.platform,
    genre: game.genre,
    franchise: game.franchise,
    purchaseSource: game.purchaseSource,
    acquiredFree: game.acquiredFree,
    originalPrice: game.originalPrice,
    subscriptionSource: game.subscriptionSource,
    notes: game.notes,
    review: game.review,
    reviewMessages: game.reviewMessages,
    datePurchased: game.datePurchased,
    startDate: game.startDate,
    endDate: game.endDate,
    playLogs: game.playLogs,
    thumbnail: game.thumbnail,
    awards: game.awards,
    isSpecial: game.isSpecial,
    queuePosition: game.queuePosition,
  };
}

/**
 * Builds a restore plan from a snapshot vs. the current library.
 *
 * Safe mode (default, `exact: false`): brings back deleted games and reverts
 * changed fields on games that still exist — never deletes a game that exists
 * now but wasn't in the snapshot (it might be something you added since).
 *
 * Exact mode (`exact: true`): also deletes games added after the snapshot, so
 * the library matches the snapshot exactly.
 */
export function buildRestorePlan(snapshot: LibrarySnapshot, currentGames: Game[], options: { exact: boolean }): RestorePlan {
  const diff = diffSnapshot(snapshot.games, currentGames);
  const snapById = new Map(snapshot.games.map(g => [g.id, g]));

  const toRevert: RevertChange[] = diff.modified.map(m => {
    const snapGame = snapById.get(m.id);
    const changes: Record<string, unknown> = {};
    if (snapGame) {
      for (const change of m.changes) {
        changes[change.field] = (snapGame as unknown as Record<string, unknown>)[change.field];
      }
    }
    return { id: m.id, name: m.name, changes: changes as Partial<Game> };
  });

  return {
    toReAdd: diff.removed,
    toRevert,
    toRemove: options.exact ? diff.added.map(g => g.id) : [],
  };
}
