'use client';

/**
 * Gaming Time Capsule — a personal prediction or note you seal today and that
 * only unlocks on a future date you choose. Every other "future" surface in
 * this app (Shelf Life Expiry, Completion Probability, Queue Shame) is a
 * system-generated forecast; this is the one place where the user writes
 * their own forward-looking message to themselves. Like the queue
 * preferences / library snapshots, it's personal planning ephemera rather
 * than core game data, so it stays device-local and skips the Hybrid/Firebase
 * repository (which would also require a deployed Firestore rule).
 */

import { Game } from './types';

export interface TimeCapsuleGameSnapshot {
  id: string;
  name: string;
  status: string;
  hours: number;
  rating: number;
}

export interface TimeCapsule {
  id: string;
  createdAt: string;
  openDate: string; // ISO date string — the capsule unlocks once "now" reaches this date
  note: string;
  games: TimeCapsuleGameSnapshot[]; // snapshot of tagged games at seal-time, for the reveal comparison
  opened: boolean;
  openedAt?: string;
}

const KEY = (userId: string) => `ga-time-capsules-${userId || 'local-user'}`;
const MAX_CAPSULES = 50;

export function getCapsules(userId: string): TimeCapsule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimeCapsule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(userId: string, capsules: TimeCapsule[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(capsules));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function snapshotGame(game: Game): TimeCapsuleGameSnapshot {
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    hours: game.hours || 0,
    rating: game.rating || 0,
  };
}

export function sealCapsule(
  userId: string,
  note: string,
  openDate: string,
  games: Game[]
): TimeCapsule {
  const capsule: TimeCapsule = {
    id: `capsule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    openDate,
    note,
    games: games.map(snapshotGame),
    opened: false,
  };
  const next = [capsule, ...getCapsules(userId)].slice(0, MAX_CAPSULES);
  persist(userId, next);
  return capsule;
}

export function markOpened(userId: string, id: string): void {
  const capsules = getCapsules(userId).map(c =>
    c.id === id && !c.opened ? { ...c, opened: true, openedAt: new Date().toISOString() } : c
  );
  persist(userId, capsules);
}

export function deleteCapsule(userId: string, id: string): void {
  persist(userId, getCapsules(userId).filter(c => c.id !== id));
}

/** Capsules whose openDate has arrived but haven't been marked opened yet. */
export function getDueCapsules(userId: string): TimeCapsule[] {
  const now = new Date().toISOString();
  return getCapsules(userId)
    .filter(c => !c.opened && c.openDate <= now)
    .sort((a, b) => a.openDate.localeCompare(b.openDate));
}

export function getSealedCapsules(userId: string): TimeCapsule[] {
  return getCapsules(userId)
    .filter(c => !c.opened)
    .sort((a, b) => a.openDate.localeCompare(b.openDate));
}

export function getOpenedCapsules(userId: string): TimeCapsule[] {
  return getCapsules(userId)
    .filter(c => c.opened)
    .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''));
}

export interface CapsuleOutcome {
  snapshot: TimeCapsuleGameSnapshot;
  current: TimeCapsuleGameSnapshot | null; // null if the game no longer exists
  hoursDelta: number;
  ratingDelta: number;
  statusChanged: boolean;
}

/** Compares a capsule's tagged-game snapshots against the current library, for the reveal screen. */
export function getCapsuleOutcomes(capsule: TimeCapsule, currentGames: Game[]): CapsuleOutcome[] {
  const currentMap = new Map(currentGames.map(g => [g.id, g]));
  return capsule.games.map(snapshot => {
    const game = currentMap.get(snapshot.id);
    const current = game ? snapshotGame(game) : null;
    return {
      snapshot,
      current,
      hoursDelta: current ? current.hours - snapshot.hours : 0,
      ratingDelta: current ? current.rating - snapshot.rating : 0,
      statusChanged: current ? current.status !== snapshot.status : false,
    };
  });
}
