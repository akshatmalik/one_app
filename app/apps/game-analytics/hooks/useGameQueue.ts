'use client';

import { useState, useMemo } from 'react';
import { Game } from '../lib/types';

type QueueUpdate = { id: string; changes: Partial<Game> };

export function useGameQueue(
  games: Game[],
  updateManyGames: (updates: QueueUpdate[]) => Promise<void>
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
      const updates: QueueUpdate[] = games
        .filter(g => g.id !== gameId && g.queuePosition !== undefined && (g.queuePosition || 0) >= 2)
        .map(g => ({ id: g.id, changes: { queuePosition: (g.queuePosition || 0) + 1 } }));
      updates.push({ id: gameId, changes: { queuePosition: 2 } });
      await updateManyGames(updates);
    } else {
      const positions = games
        .filter(g => g.queuePosition !== undefined)
        .map(g => g.queuePosition || 0);
      const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 1;
      await updateManyGames([{ id: gameId, changes: { queuePosition: nextPosition } }]);
    }
  };

  // Remove a game from the queue (clears its position and closes the gap) — one batch
  const removeFromQueue = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.queuePosition === undefined) return;

    const removedPosition = game.queuePosition;
    const updates: QueueUpdate[] = [{ id: gameId, changes: { queuePosition: undefined } }];
    games
      .filter(g => g.id !== gameId && g.queuePosition !== undefined && g.queuePosition > removedPosition)
      .forEach(g => updates.push({ id: g.id, changes: { queuePosition: (g.queuePosition || 0) - 1 } }));

    await updateManyGames(updates);
  };

  // Set the queue order from a fully-ordered list of game ids (the displayed
  // order after a drag). Renumbering the whole queue from the visible sequence
  // avoids the display-index vs stored-position mismatch caused by floating
  // finished games to the bottom.
  const setQueueOrder = async (orderedIds: string[]) => {
    const updates: QueueUpdate[] = [];
    orderedIds.forEach((id, i) => {
      const position = i + 1;
      const g = games.find(x => x.id === id);
      if (g && g.queuePosition !== position) {
        updates.push({ id, changes: { queuePosition: position } });
      }
    });
    if (updates.length > 0) await updateManyGames(updates);
  };

  // Clear everything planned for "after today" — removes all queued games EXCEPT
  // the ones currently being played (In Progress). The active game(s) stay put;
  // the on-deck/backlog you'd planned for later get cleared out.
  const clearUpcoming = async () => {
    const toClear = games.filter(
      g => g.queuePosition !== undefined && g.status !== 'In Progress'
    );
    if (toClear.length === 0) return;
    await updateManyGames(toClear.map(g => ({ id: g.id, changes: { queuePosition: undefined } })));
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
    setQueueOrder,
    clearUpcoming,
    isInQueue,
  };
}
