'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Game } from '../lib/types';
import {
  ActiveBracket,
  BracketHistoryEntry,
  BracketMatch,
  appendBracketHistory,
  loadActiveBracket,
  loadBracketHistory,
  saveActiveBracket,
} from '../lib/bracket-storage';

export const BRACKET_SIZES = [4, 8, 16] as const;
export type BracketSize = (typeof BRACKET_SIZES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function safeTime(d?: string): number {
  if (!d) return NaN;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? NaN : t;
}

// How long a game has been sitting untouched — purchase age and time since it
// was last played, whichever paints the more neglected picture. Games never
// played at all lean entirely on purchase age.
function neglectScore(game: Game, nowMs: number): number {
  const purchasedMs = safeTime(game.datePurchased);
  const daysSincePurchase = Number.isNaN(purchasedMs) ? 0 : Math.max(0, (nowMs - purchasedMs) / DAY_MS);

  const logTimes = (game.playLogs ?? []).map(l => safeTime(l.date)).filter(t => !Number.isNaN(t));
  const lastPlayedMs = logTimes.length > 0 ? Math.max(...logTimes) : safeTime(game.startDate);
  const daysSincePlayed = Number.isNaN(lastPlayedMs) ? daysSincePurchase : Math.max(0, (nowMs - lastPlayedMs) / DAY_MS);

  return daysSincePurchase + daysSincePlayed;
}

function weightedSampleWithoutReplacement<T>(items: T[], weights: number[], count: number): T[] {
  const pool = items.map((item, i) => ({ item, weight: Math.max(weights[i], 0.01) }));
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    const safeIdx = Math.min(idx, pool.length - 1);
    picked.push(pool[safeIdx].item);
    pool.splice(safeIdx, 1);
  }
  return picked;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRound(gameIds: string[], round: number): BracketMatch[] {
  const matches: BracketMatch[] = [];
  for (let i = 0; i < gameIds.length; i += 2) {
    matches.push({ round, slot: i / 2, gameAId: gameIds[i], gameBId: gameIds[i + 1] ?? null });
  }
  return matches;
}

// Largest power of two (capped to `cap`) that's <= n, with a floor of 4.
function fittingSize(requested: number, eligibleCount: number): number {
  const cap = Math.min(requested, eligibleCount);
  let size = 4;
  for (const s of BRACKET_SIZES) {
    if (s <= cap) size = s;
  }
  return size;
}

export function useBacklogBracket(games: Game[], userId: string) {
  const [active, setActive] = useState<ActiveBracket | null>(null);
  const [history, setHistory] = useState<BracketHistoryEntry[]>([]);

  useEffect(() => {
    setActive(loadActiveBracket(userId));
    setHistory(loadBracketHistory(userId));
  }, [userId]);

  const eligibleGames = useMemo(
    () => games.filter(g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned'),
    [games]
  );

  const gamesById = useMemo(() => {
    const map = new Map<string, Game>();
    games.forEach(g => map.set(g.id, g));
    return map;
  }, [games]);

  const startBracket = useCallback((requestedSize: BracketSize) => {
    if (eligibleGames.length < 4) return;
    const size = fittingSize(requestedSize, eligibleGames.length);
    const now = Date.now();
    const weights = eligibleGames.map(g => neglectScore(g, now));
    const field = shuffle(weightedSampleWithoutReplacement(eligibleGames, weights, size));
    const fieldIds = field.map(g => g.id);

    const bracket: ActiveBracket = {
      id: `bracket-${now}`,
      createdAt: new Date(now).toISOString(),
      size,
      gameIds: fieldIds,
      matches: buildRound(fieldIds, 0),
      currentRound: 0,
    };
    saveActiveBracket(userId, bracket);
    setActive(bracket);
  }, [eligibleGames, userId]);

  const currentMatch = useMemo(() => {
    if (!active || active.championId) return null;
    return active.matches.find(m => m.round === active.currentRound && !m.winnerId) ?? null;
  }, [active]);

  const roundLabel = useMemo(() => {
    if (!active) return '';
    const remainingInRound = active.matches.filter(m => m.round === active.currentRound).length;
    const playersLeft = remainingInRound * 2;
    if (playersLeft <= 2) return 'Final';
    if (playersLeft <= 4) return 'Semifinal';
    if (playersLeft <= 8) return 'Quarterfinal';
    return `Round of ${playersLeft}`;
  }, [active]);

  const pickWinner = useCallback((winnerId: string) => {
    if (!active || !currentMatch) return;

    const updatedMatches = active.matches.map(m =>
      m.round === currentMatch.round && m.slot === currentMatch.slot ? { ...m, winnerId } : m
    );

    const currentRoundMatches = updatedMatches
      .filter(m => m.round === active.currentRound)
      .sort((a, b) => a.slot - b.slot);
    const allResolved = currentRoundMatches.every(m => !!m.winnerId);

    if (!allResolved) {
      const next: ActiveBracket = { ...active, matches: updatedMatches };
      saveActiveBracket(userId, next);
      setActive(next);
      return;
    }

    const winners = currentRoundMatches.map(m => m.winnerId as string);

    if (winners.length === 1) {
      const championId = winners[0];
      const finished: ActiveBracket = { ...active, matches: updatedMatches, championId };
      saveActiveBracket(userId, finished);
      setActive(finished);

      const champion = gamesById.get(championId);
      const runnerUp = currentRoundMatches[0]
        ? gamesById.get(
            currentRoundMatches[0].gameAId === championId
              ? (currentRoundMatches[0].gameBId ?? '')
              : (currentRoundMatches[0].gameAId ?? '')
          )
        : undefined;

      if (champion) {
        const entry: BracketHistoryEntry = {
          id: finished.id,
          completedAt: new Date().toISOString(),
          size: finished.size,
          championId,
          championName: champion.name,
          runnerUpId: runnerUp?.id,
          runnerUpName: runnerUp?.name,
          fieldIds: finished.gameIds,
        };
        setHistory(appendBracketHistory(userId, entry));
      }
      return;
    }

    const nextRound = active.currentRound + 1;
    const nextMatches = updatedMatches.concat(buildRound(winners, nextRound));
    const next: ActiveBracket = { ...active, matches: nextMatches, currentRound: nextRound };
    saveActiveBracket(userId, next);
    setActive(next);
  }, [active, currentMatch, gamesById, userId]);

  const cancelBracket = useCallback(() => {
    saveActiveBracket(userId, null);
    setActive(null);
  }, [userId]);

  const champion = active?.championId ? gamesById.get(active.championId) ?? null : null;

  return {
    eligibleGames,
    active,
    history,
    currentMatch,
    roundLabel,
    champion,
    startBracket,
    pickWinner,
    cancelBracket,
    gamesById,
  };
}
