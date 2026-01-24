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

    // Collect all updates to batch them
    const updates: Array<{ id: string; position: number | null }> = [];

    // Remove this game from queue (use null instead of undefined for proper deletion)
    updates.push({ id: gameId, position: null });

    // Shift down all games after this position
    const gamesToShift = games.filter(
      g => g.id !== gameId && g.queuePosition !== undefined && g.queuePosition > removedPosition
    );

    for (const g of gamesToShift) {
      updates.push({ id: g.id, position: (g.queuePosition || 0) - 1 });
    }

    // Execute all updates
    for (const update of updates) {
      await updateGame(update.id, { queuePosition: update.position === null ? undefined : update.position });
    }
  };

  // Reorder a game in the queue
  const reorderQueue = async (gameId: string, newPosition: number) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.queuePosition === undefined) return;

    const oldPosition = game.queuePosition;
    if (oldPosition === newPosition) return;

    // Collect all updates
    const updates: Array<{ id: string; position: number }> = [];

    // Update the dragged game
    updates.push({ id: gameId, position: newPosition });

    // Shift other games
    if (newPosition < oldPosition) {
      // Moving up - shift down games between new and old position
      const gamesToShift = games.filter(
        g => g.id !== gameId &&
             g.queuePosition !== undefined &&
             g.queuePosition >= newPosition &&
             g.queuePosition < oldPosition
      );

      for (const g of gamesToShift) {
        updates.push({ id: g.id, position: (g.queuePosition || 0) + 1 });
      }
    } else {
      // Moving down - shift up games between old and new position
      const gamesToShift = games.filter(
        g => g.id !== gameId &&
             g.queuePosition !== undefined &&
             g.queuePosition > oldPosition &&
             g.queuePosition <= newPosition
      );

      for (const g of gamesToShift) {
        updates.push({ id: g.id, position: (g.queuePosition || 0) - 1 });
      }
    }

    // Execute all updates in sequence
    // Note: Each update will trigger a re-render, but this is unavoidable
    // without batching support in the parent component
    for (const update of updates) {
      await updateGame(update.id, { queuePosition: update.position });
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
