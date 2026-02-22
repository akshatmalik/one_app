'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameAward, AwardPeriodType } from '../lib/types';

/**
 * Manages gaming awards embedded within game documents.
 * Awards are stored as game.awards[] — no separate collection needed.
 * Uses the existing updateGame from useGames, inheriting HybridRepository (Firestore/localStorage).
 */
export function useAwards(
  games: Game[],
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>
) {
  /** Give an award to a game. Replaces any existing award in the same category+period. */
  const giveAward = useCallback(async (
    gameId: string,
    awardData: Omit<GameAward, 'id' | 'awardedAt'>
  ) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const newAward: GameAward = {
      id: uuidv4(),
      ...awardData,
      awardedAt: new Date().toISOString(),
    };

    // Remove any prior winner for this category+period (only one winner per slot)
    const filtered = (game.awards || []).filter(
      a => !(a.category === awardData.category && a.periodKey === awardData.periodKey)
    );
    await updateGame(gameId, { awards: [...filtered, newAward] });
  }, [games, updateGame]);

  /**
   * Change the winner for a category+period.
   * Removes the award from the old game (if different) and gives it to the new game.
   */
  const changePick = useCallback(async (
    newGameId: string,
    oldGameId: string | null,
    awardData: Omit<GameAward, 'id' | 'awardedAt'>
  ) => {
    // Strip from old winner first
    if (oldGameId && oldGameId !== newGameId) {
      const oldGame = games.find(g => g.id === oldGameId);
      if (oldGame) {
        await updateGame(oldGameId, {
          awards: (oldGame.awards || []).filter(
            a => !(a.category === awardData.category && a.periodKey === awardData.periodKey)
          ),
        });
      }
    }
    await giveAward(newGameId, awardData);
  }, [games, updateGame, giveAward]);

  /** Remove a specific award by ID from a game. */
  const removeAward = useCallback(async (gameId: string, awardId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    await updateGame(gameId, {
      awards: (game.awards || []).filter(a => a.id !== awardId),
    });
  }, [games, updateGame]);

  /** Get all awards for a specific game. */
  const getAwardsForGame = useCallback((gameId: string): GameAward[] => {
    return games.find(g => g.id === gameId)?.awards || [];
  }, [games]);

  /** Get all awards given in a period, returning { game, award } pairs. */
  const getAwardsForPeriod = useCallback((
    periodType: AwardPeriodType,
    periodKey: string
  ): Array<{ game: Game; award: GameAward }> => {
    const result: Array<{ game: Game; award: GameAward }> = [];
    for (const game of games) {
      for (const award of (game.awards || [])) {
        if (award.periodType === periodType && award.periodKey === periodKey) {
          result.push({ game, award });
        }
      }
    }
    return result.sort((a, b) => a.award.awardedAt.localeCompare(b.award.awardedAt));
  }, [games]);

  /**
   * Get current picks for a period as Record<categoryId, gameId>.
   * Useful for initializing the awards screen state.
   */
  const getPicksForPeriod = useCallback((
    periodType: AwardPeriodType,
    periodKey: string
  ): Record<string, string> => {
    const picks: Record<string, string> = {};
    for (const game of games) {
      for (const award of (game.awards || [])) {
        if (award.periodType === periodType && award.periodKey === periodKey) {
          picks[award.category] = game.id;
        }
      }
    }
    return picks;
  }, [games]);

  return { giveAward, changePick, removeAward, getAwardsForGame, getAwardsForPeriod, getPicksForPeriod };
}

// ── Period key helpers ────────────────────────────────────────────

export function awardWeekKey(date: Date): string {
  // ISO-like week: year + week number (Mon start)
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

export function awardMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function awardQuarterKey(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}-Q${q}`;
}

export function awardYearKey(date: Date): string {
  return `${date.getFullYear()}`;
}

export function awardWeekLabel(weekStart: Date, weekEnd: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

export function awardMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function awardQuarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}
