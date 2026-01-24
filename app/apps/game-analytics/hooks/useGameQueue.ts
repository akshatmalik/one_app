'use client';

import { useState, useMemo } from 'react';
import { Game } from '../lib/types';

export function useGameQueue(
  games: Game[],
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>
) {
  const [hideFinished, setHideFinished] = useState(false);

  // Get games in the queue, sorted by position
  const queuedGames = useMemo(() => {
    const gamesInQueue = games.filter(g => g.queuePosition !== undefined);
    const sorted = gamesInQueue.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

    if (hideFinished) {
      return sorted.filter(g => g.status !== 'Completed' && g.status !== 'Abandoned');
    }

    return sorted;
  }, [games, hideFinished]);

  // Get games not in the queue (for adding)
  const availableGames = useMemo(() => {
    return games.filter(g => g.queuePosition === undefined);
  }, [games]);

  // Add a game to the queue
  const addToQueue = async (gameId: string) => {
    // Find the highest position
    const positions = games
      .filter(g => g.queuePosition !== undefined)
      .map(g => g.queuePosition || 0);
    const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 1;

    await updateGame(gameId, { queuePosition: nextPosition });
  };

  // Remove a game from the queue
  const removeFromQueue = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.queuePosition === undefined) return;

    const removedPosition = game.queuePosition;

    // Remove this game from queue
    await updateGame(gameId, { queuePosition: undefined });

    // Shift down all games after this position
    const gamesToUpdate = games.filter(
      g => g.queuePosition !== undefined && g.queuePosition > removedPosition
    );

    for (const g of gamesToUpdate) {
      await updateGame(g.id, { queuePosition: (g.queuePosition || 0) - 1 });
    }
  };

  // Reorder a game in the queue
  const reorderQueue = async (gameId: string, newPosition: number) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.queuePosition === undefined) return;

    const oldPosition = game.queuePosition;
    if (oldPosition === newPosition) return;

    // Update the dragged game
    await updateGame(gameId, { queuePosition: newPosition });

    // Shift other games
    if (newPosition < oldPosition) {
      // Moving up - shift down games between new and old position
      const gamesToUpdate = games.filter(
        g => g.id !== gameId &&
             g.queuePosition !== undefined &&
             g.queuePosition >= newPosition &&
             g.queuePosition < oldPosition
      );

      for (const g of gamesToUpdate) {
        await updateGame(g.id, { queuePosition: (g.queuePosition || 0) + 1 });
      }
    } else {
      // Moving down - shift up games between old and new position
      const gamesToUpdate = games.filter(
        g => g.id !== gameId &&
             g.queuePosition !== undefined &&
             g.queuePosition > oldPosition &&
             g.queuePosition <= newPosition
      );

      for (const g of gamesToUpdate) {
        await updateGame(g.id, { queuePosition: (g.queuePosition || 0) - 1 });
      }
    }
  };

  // Check if a game is in the queue
  const isInQueue = (gameId: string): boolean => {
    const game = games.find(g => g.id === gameId);
    return game?.queuePosition !== undefined;
  };

  return {
    queuedGames,
    availableGames,
    hideFinished,
    setHideFinished,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    isInQueue,
  };
}
