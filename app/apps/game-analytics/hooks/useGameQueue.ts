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

    // Float completed/abandoned to the bottom, preserving relative order within each group
    const active = sorted.filter(g => g.status !== 'Completed' && g.status !== 'Abandoned');
    const finished = sorted.filter(g => g.status === 'Completed' || g.status === 'Abandoned');
    return [...active, ...finished];
  }, [games, hideFinished]);

  // Get games not in the queue (for adding)
  const availableGames = useMemo(() => {
    return games.filter(g => g.queuePosition === undefined);
  }, [games]);

  // Add a game to the queue — inserts at position 2 if there's a Now Playing hero, otherwise at the end
  const addToQueue = async (gameId: string) => {
    const sortedQueue = games
      .filter(g => g.queuePosition !== undefined)
      .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

    const heroGame = sortedQueue[0];
    const hasHero = heroGame && heroGame.status === 'In Progress';

    if (hasHero) {
      // Shift all games at position >= 2 down by 1, then insert at 2
      const gamesToShift = games.filter(
        g => g.id !== gameId && g.queuePosition !== undefined && (g.queuePosition || 0) >= 2
      );
      await Promise.all([
        ...gamesToShift.map(g => updateGame(g.id, { queuePosition: (g.queuePosition || 0) + 1 })),
        updateGame(gameId, { queuePosition: 2 }),
      ]);
    } else {
      const positions = games
        .filter(g => g.queuePosition !== undefined)
        .map(g => g.queuePosition || 0);
      const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 1;
      await updateGame(gameId, { queuePosition: nextPosition });
    }
  };

  // Remove a game from the queue
  const removeFromQueue = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.queuePosition === undefined) return;

    const removedPosition = game.queuePosition;

    const gamesToShift = games.filter(
      g => g.id !== gameId && g.queuePosition !== undefined && g.queuePosition > removedPosition
    );

    // Run all updates in parallel — React 18 batches the resulting state updates
    await Promise.all([
      updateGame(gameId, { queuePosition: undefined }),
      ...gamesToShift.map(g => updateGame(g.id, { queuePosition: (g.queuePosition || 0) - 1 })),
    ]);
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

    // Run all updates in parallel — React 18 batches the resulting state updates
    await Promise.all(updates.map(u => updateGame(u.id, { queuePosition: u.position })));
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
