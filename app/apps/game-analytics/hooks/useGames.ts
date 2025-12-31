'use client';

import { useState, useEffect, useCallback } from 'react';
import { Game } from '../lib/types';
import { gameRepository } from '../lib/storage';

export function useGames(userId: string | null) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Set userId on repository - use 'local-user' for local mode
      gameRepository.setUserId(userId || 'local-user');

      const data = await gameRepository.getAll();
      setGames(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGame = async (gameData: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newGame = await gameRepository.create(gameData);
      await refresh();
      return newGame;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateGame = async (id: string, updates: Partial<Game>) => {
    try {
      const updated = await gameRepository.update(id, updates);
      await refresh();
      return updated;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteGame = async (id: string) => {
    try {
      await gameRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    games,
    loading,
    error,
    addGame,
    updateGame,
    deleteGame,
    refresh,
  };
}
