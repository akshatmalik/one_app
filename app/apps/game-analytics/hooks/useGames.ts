'use client';

import { useState, useEffect } from 'react';
import { Game } from '../lib/types';
import { gameRepository } from '../lib/storage';

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await gameRepository.getAll();
      setGames(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const addGame = async (gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
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
