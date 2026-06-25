'use client';

/**
 * Collections — user-defined custom lists for grouping games any way you like
 * ("Couch Co-op", "Comfort Replays", "2026 Backlog Push"...), independent of
 * genre/platform/status. Membership is stored as a list of game IDs in a
 * brand-new device-local file rather than as a field on Game, so this never
 * touches the Game data model, the repository layer, or Firestore rules —
 * same device-local precedent as wishlist-priority.ts/squad-storage.ts.
 */

export interface GameCollection {
  id: string;
  name: string;
  emoji: string;
  gameIds: string[];
  createdAt: string;
  updatedAt: string;
}

const keyFor = (userId: string) => `ga-collections-${userId || 'local-user'}`;

function isValidCollection(value: unknown): value is GameCollection {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.emoji === 'string' &&
    Array.isArray(c.gameIds) &&
    c.gameIds.every(id => typeof id === 'string') &&
    typeof c.createdAt === 'string' &&
    typeof c.updatedAt === 'string'
  );
}

export function getCollections(userId: string): GameCollection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCollection);
  } catch {
    return [];
  }
}

function saveCollections(userId: string, collections: GameCollection[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(collections));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function createCollection(userId: string, name: string, emoji: string): GameCollection {
  const collections = getCollections(userId);
  const now = new Date().toISOString();
  const collection: GameCollection = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Untitled Collection',
    emoji: emoji || '🗂️',
    gameIds: [],
    createdAt: now,
    updatedAt: now,
  };
  saveCollections(userId, [...collections, collection]);
  return collection;
}

export function renameCollection(userId: string, id: string, name: string, emoji: string): void {
  const collections = getCollections(userId);
  const next = collections.map(c =>
    c.id === id ? { ...c, name: name.trim() || c.name, emoji: emoji || c.emoji, updatedAt: new Date().toISOString() } : c
  );
  saveCollections(userId, next);
}

export function deleteCollection(userId: string, id: string): void {
  const collections = getCollections(userId);
  saveCollections(userId, collections.filter(c => c.id !== id));
}

export function addGameToCollection(userId: string, collectionId: string, gameId: string): void {
  const collections = getCollections(userId);
  const next = collections.map(c =>
    c.id === collectionId && !c.gameIds.includes(gameId)
      ? { ...c, gameIds: [...c.gameIds, gameId], updatedAt: new Date().toISOString() }
      : c
  );
  saveCollections(userId, next);
}

export function removeGameFromCollection(userId: string, collectionId: string, gameId: string): void {
  const collections = getCollections(userId);
  const next = collections.map(c =>
    c.id === collectionId
      ? { ...c, gameIds: c.gameIds.filter(id => id !== gameId), updatedAt: new Date().toISOString() }
      : c
  );
  saveCollections(userId, next);
}

/** Drops a deleted game's ID from every collection — call this from a game-delete handler. */
export function pruneGameFromCollections(userId: string, gameId: string): void {
  const collections = getCollections(userId);
  const next = collections.map(c =>
    c.gameIds.includes(gameId)
      ? { ...c, gameIds: c.gameIds.filter(id => id !== gameId), updatedAt: new Date().toISOString() }
      : c
  );
  saveCollections(userId, next);
}
