'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  GameCollection,
  getCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  addGameToCollection,
  removeGameFromCollection,
  pruneGameFromCollections,
} from '../lib/collections-storage';

export function useCollections(userId: string | null) {
  const uid = userId ?? 'local-user';
  const [collections, setCollections] = useState<GameCollection[]>([]);

  const refresh = useCallback(() => {
    setCollections(getCollections(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback((name: string, emoji: string) => {
    const collection = createCollection(uid, name, emoji);
    refresh();
    return collection;
  }, [uid, refresh]);

  const rename = useCallback((id: string, name: string, emoji: string) => {
    renameCollection(uid, id, name, emoji);
    refresh();
  }, [uid, refresh]);

  const remove = useCallback((id: string) => {
    deleteCollection(uid, id);
    refresh();
  }, [uid, refresh]);

  const addGame = useCallback((collectionId: string, gameId: string) => {
    addGameToCollection(uid, collectionId, gameId);
    refresh();
  }, [uid, refresh]);

  const removeGame = useCallback((collectionId: string, gameId: string) => {
    removeGameFromCollection(uid, collectionId, gameId);
    refresh();
  }, [uid, refresh]);

  const pruneGame = useCallback((gameId: string) => {
    pruneGameFromCollections(uid, gameId);
    refresh();
  }, [uid, refresh]);

  const getCollectionsForGame = useCallback(
    (gameId: string) => collections.filter(c => c.gameIds.includes(gameId)),
    [collections]
  );

  return {
    collections,
    create,
    rename,
    remove,
    addGame,
    removeGame,
    pruneGame,
    getCollectionsForGame,
    refresh,
  };
}
