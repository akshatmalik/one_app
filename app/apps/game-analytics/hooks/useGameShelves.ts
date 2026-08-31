'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameShelf, GameShelfRule, loadGameShelves, saveGameShelves } from '../lib/game-shelves';

export interface CreateShelfInput {
  name: string;
  description: string;
  mode: 'static' | 'smart';
  gameIds: string[];
  rules?: GameShelfRule;
}

function shelfId(): string {
  return `shelf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useGameShelves(userId: string | null) {
  const storageUserId = userId || 'local-user';
  const [shelves, setShelves] = useState<GameShelf[]>(() => loadGameShelves(storageUserId));

  useEffect(() => {
    setShelves(loadGameShelves(storageUserId));
  }, [storageUserId]);

  const createShelf = useCallback((input: CreateShelfInput): GameShelf => {
    const now = new Date().toISOString();
    const shelf: GameShelf = { ...input, id: shelfId(), createdAt: now, updatedAt: now };
    setShelves(current => {
      const next = [shelf, ...current];
      saveGameShelves(storageUserId, next);
      return next;
    });
    return shelf;
  }, [storageUserId]);

  const deleteShelf = useCallback((id: string) => {
    setShelves(current => {
      const next = current.filter(shelf => shelf.id !== id);
      saveGameShelves(storageUserId, next);
      return next;
    });
  }, [storageUserId]);

  return { shelves, createShelf, deleteShelf };
}

