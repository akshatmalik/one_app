'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameRanking, RatingBattle, RankingPeriod } from '../lib/types';
import { rankingRepository, battleRepository } from '../lib/ranking-storage';
import { logError } from '../lib/error-log';

// ── ELO helpers ──────────────────────────────────────────────────────

const INITIAL_ELO = 1000;

function kFactor(battlesCount: number): number {
  if (battlesCount < 10) return 32;
  if (battlesCount < 30) return 16;
  return 8;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function computeEloChanges(
  winnerElo: number,
  loserElo: number,
  winnerBattles: number,
  loserBattles: number,
): { winnerChange: number; loserChange: number } {
  const k = Math.max(kFactor(winnerBattles), kFactor(loserBattles));
  const expectedWin = expectedScore(winnerElo, loserElo);
  const winnerChange = Math.round(k * (1 - expectedWin));
  const loserChange = Math.round(k * (0 - (1 - expectedWin)));
  return { winnerChange, loserChange };
}

// ── Period key helpers ───────────────────────────────────────────────

export function getPeriodKey(period: RankingPeriod, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');

  if (period === 'all') return 'all';
  if (period === 'year') return String(y);
  if (period === 'month') return `${y}-${m}`;

  if (period === 'quarter') {
    const q = Math.ceil((date.getMonth() + 1) / 3);
    return `${y}-Q${q}`;
  }

  if (period === 'week') {
    // ISO week
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  return 'all';
}

export function getPeriodLabel(period: RankingPeriod, date = new Date()): string {
  if (period === 'all') return 'All Time';
  if (period === 'year') return String(date.getFullYear());
  if (period === 'month') {
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period === 'quarter') {
    const q = Math.ceil((date.getMonth() + 1) / 3);
    return `Q${q} ${date.getFullYear()}`;
  }
  if (period === 'week') {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1); // Monday
    const end = new Date(d);
    end.setDate(end.getDate() + 6);   // Sunday
    const fmt = (dt: Date) => dt.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const sameMonth = end.getMonth() === d.getMonth();
    return `${fmt(d)}–${sameMonth ? end.getDate() : fmt(end)}, ${d.getFullYear()}`;
  }
  return period;
}

export function getPeriodRange(period: RankingPeriod, date = new Date()): { start: Date; end: Date } | null {
  if (period === 'all') return null;

  const y = date.getFullYear();
  const mo = date.getMonth();

  if (period === 'year') {
    return { start: new Date(y, 0, 1, 0, 0, 0), end: new Date(y, 11, 31, 23, 59, 59) };
  }

  if (period === 'month') {
    return { start: new Date(y, mo, 1, 0, 0, 0), end: new Date(y, mo + 1, 0, 23, 59, 59) };
  }

  if (period === 'quarter') {
    const q = Math.floor(mo / 3);
    return { start: new Date(y, q * 3, 1, 0, 0, 0), end: new Date(y, q * 3 + 3, 0, 23, 59, 59) };
  }

  if (period === 'week') {
    const day = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  return null;
}

// ── Hook ─────────────────────────────────────────────────────────────

export interface UseRankingsReturn {
  rankings: GameRanking[];
  battles: RatingBattle[];
  loading: boolean;
  submitting: boolean;
  recordBattle: (winnerId: string, loserId: string) => Promise<void>;
  refresh: () => Promise<void>;
  getBattleCount: (gameId1: string, gameId2: string) => number;
  getNextPair: (eligibleIds: string[]) => [string, string] | null;
}

export function useRankings(
  userId: string | null,
  period: RankingPeriod,
  periodKey: string,
): UseRankingsReturn {
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [battles, setBattles] = useState<RatingBattle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Propagate userId to repos
  useEffect(() => {
    rankingRepository.setUserId(userId || '');
    battleRepository.setUserId(userId || '');
  }, [userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([
        rankingRepository.getForPeriod(period, periodKey),
        battleRepository.getForPeriod(period, periodKey),
      ]);
      setRankings(r);
      setBattles(b);
    } catch (err) {
      logError('Failed to load rankings/battles', 'useRankings.refresh', err);
    } finally {
      setLoading(false);
    }
  }, [period, periodKey]);

  useEffect(() => { refresh(); }, [refresh]);

  // Count battles between a specific pair (from already-loaded battles list)
  const getBattleCount = useCallback((id1: string, id2: string): number => {
    return battles.filter(b =>
      (b.winnerId === id1 && b.loserId === id2) ||
      (b.winnerId === id2 && b.loserId === id1)
    ).length;
  }, [battles]);

  // Smart matchmaking: pick pair with fewest battles, prefer untested pairs,
  // break ties by closest ELO (most interesting match)
  const getNextPair = useCallback((eligibleIds: string[]): [string, string] | null => {
    if (eligibleIds.length < 2) return null;

    // Build a map of battle counts per pair
    const pairCounts: Map<string, number> = new Map();
    const pairKey = (a: string, b: string) => [a, b].sort().join('|');

    battles.forEach(b => {
      const k = pairKey(b.winnerId, b.loserId);
      pairCounts.set(k, (pairCounts.get(k) || 0) + 1);
    });

    // Build ELO map
    const eloMap: Map<string, number> = new Map(
      rankings.map(r => [r.gameId, r.eloScore])
    );

    let bestPair: [string, string] | null = null;
    let bestScore = Infinity; // lower = better candidate

    for (let i = 0; i < eligibleIds.length; i++) {
      for (let j = i + 1; j < eligibleIds.length; j++) {
        const a = eligibleIds[i];
        const b = eligibleIds[j];
        const count = pairCounts.get(pairKey(a, b)) || 0;
        const eloA = eloMap.get(a) ?? INITIAL_ELO;
        const eloB = eloMap.get(b) ?? INITIAL_ELO;
        const eloDiff = Math.abs(eloA - eloB);
        // Score: primarily minimize battle count, then minimize elo difference
        const score = count * 10000 + eloDiff;
        if (score < bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }

    return bestPair;
  }, [battles, rankings]);

  const recordBattle = useCallback(async (winnerId: string, loserId: string) => {
    setSubmitting(true);
    try {
      // Get or create rankings for both games
      const winnerRanking = rankings.find(r => r.gameId === winnerId) ?? {
        gameId: winnerId, period, periodKey,
        eloScore: INITIAL_ELO, wins: 0, losses: 0, battlesCount: 0, lastBattleAt: '',
      };
      const loserRanking = rankings.find(r => r.gameId === loserId) ?? {
        gameId: loserId, period, periodKey,
        eloScore: INITIAL_ELO, wins: 0, losses: 0, battlesCount: 0, lastBattleAt: '',
      };

      const { winnerChange, loserChange } = computeEloChanges(
        winnerRanking.eloScore,
        loserRanking.eloScore,
        winnerRanking.battlesCount,
        loserRanking.battlesCount,
      );

      const now = new Date().toISOString();

      // Save battle record first
      await battleRepository.create({
        period,
        periodKey,
        winnerId,
        loserId,
        winnerEloChange: winnerChange,
        loserEloChange: loserChange,
        battleDate: now,
      });

      // Update rankings
      await Promise.all([
        rankingRepository.upsert({
          gameId: winnerId,
          period,
          periodKey,
          eloScore: Math.max(100, winnerRanking.eloScore + winnerChange),
          wins: winnerRanking.wins + 1,
          losses: winnerRanking.losses,
          battlesCount: winnerRanking.battlesCount + 1,
          lastBattleAt: now,
        }),
        rankingRepository.upsert({
          gameId: loserId,
          period,
          periodKey,
          eloScore: Math.max(100, loserRanking.eloScore + loserChange),
          wins: loserRanking.wins,
          losses: loserRanking.losses + 1,
          battlesCount: loserRanking.battlesCount + 1,
          lastBattleAt: now,
        }),
      ]);

      await refresh();
    } catch (err) {
      logError('Failed to record battle', 'useRankings.recordBattle', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [userId, rankings, period, periodKey, refresh]);

  return { rankings, battles, loading, submitting, recordBattle, refresh, getBattleCount, getNextPair };
}
