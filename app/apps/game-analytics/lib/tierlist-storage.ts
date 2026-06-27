'use client';

/**
 * Tier List Maker — saved board storage. Device-local planning/UI-state data,
 * same precedent as kpi-history-storage.ts / quest-storage.ts: a tier board is
 * just an arrangement of existing game ids, not canonical game data, so it
 * stays out of the Hybrid/Firebase repository and Firestore schema.
 */

import { TierLetter } from './calculations';

export type TierBoardTiers = Record<TierLetter, string[]>;

export interface TierListBoard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tiers: TierBoardTiers;
}

const keyFor = (userId: string) => `ga-tierlists-${userId || 'local-user'}`;

interface TierListStore {
  boards: TierListBoard[];
}

function load(userId: string): TierListStore {
  if (typeof window === 'undefined') return { boards: [] };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { boards: [] };
    const parsed = JSON.parse(raw) as Partial<TierListStore>;
    return { boards: parsed.boards ?? [] };
  } catch {
    return { boards: [] };
  }
}

function save(userId: string, store: TierListStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(store));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getTierListBoards(userId: string): TierListBoard[] {
  return load(userId).boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveTierListBoard(userId: string, board: TierListBoard): TierListBoard[] {
  const store = load(userId);
  const idx = store.boards.findIndex(b => b.id === board.id);
  if (idx >= 0) {
    store.boards[idx] = board;
  } else {
    store.boards.push(board);
  }
  save(userId, store);
  return getTierListBoards(userId);
}

export function deleteTierListBoard(userId: string, boardId: string): TierListBoard[] {
  const store = load(userId);
  store.boards = store.boards.filter(b => b.id !== boardId);
  save(userId, store);
  return getTierListBoards(userId);
}
