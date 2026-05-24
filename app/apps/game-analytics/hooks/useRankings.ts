'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameRanking, RatingBattle, RankingPeriod } from '../lib/types';
import { rankingRepository, battleRepository } from '../lib/ranking-storage';
import { logError } from '../lib/error-log';

// ── ELO helpers ──────────────────────────────────────────────────────

const INITIAL_ELO = 1000;
const FLUSH_AFTER_COUNT = 5;  // write to Firebase after this many pending battles
const FLUSH_IDLE_MS     = 5000; // …or after 5 s of no new battles

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
  const loserChange  = Math.round(k * (0 - (1 - expectedWin)));
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
    d.setDate(d.getDate() - day + 1);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
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
  if (period === 'year')    return { start: new Date(y, 0, 1, 0, 0, 0),      end: new Date(y, 11, 31, 23, 59, 59) };
  if (period === 'month')   return { start: new Date(y, mo, 1, 0, 0, 0),     end: new Date(y, mo + 1, 0, 23, 59, 59) };
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

// ── Firebase index error helper ──────────────────────────────────────

function extractIndexUrl(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s"]+/);
  return match ? match[0] : null;
}

// ── Write-buffer types ───────────────────────────────────────────────

interface PendingBattle {
  battleData: Omit<RatingBattle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  // Final ranking state for both players at the time of the pick (used for upsert)
  winnerRank: Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  loserRank:  Omit<GameRanking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

// ── Hook ─────────────────────────────────────────────────────────────

export interface UseRankingsReturn {
  rankings: GameRanking[];
  battles: RatingBattle[];
  loading: boolean;
  /** Number of battles picked but not yet written to Firebase. */
  pendingCount: number;
  indexError: string | null;
  /** Synchronous — updates local state instantly, queues Firebase write. */
  recordBattle: (winnerId: string, loserId: string) => void;
  /** Manually flush pending writes (e.g. on navigate-away). */
  flush: () => Promise<void>;
  refresh: () => Promise<void>;
  getBattleCount: (gameId1: string, gameId2: string) => number;
  getNextPair: (eligibleIds: string[]) => [string, string] | null;
}

export function useRankings(
  userId: string | null,
  period: RankingPeriod,
  periodKey: string,
): UseRankingsReturn {
  const [rankings, setRankings]     = useState<GameRanking[]>([]);
  const [battles, setBattles]       = useState<RatingBattle[]>([]);
  const [loading, setLoading]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [indexError, setIndexError] = useState<string | null>(null);

  // Always-current rankings ref — avoids stale-closure ELO reads during rapid picks
  const rankingsRef  = useRef<GameRanking[]>([]);
  // Write buffer and flush machinery (all refs → stable, no closure issues)
  const pendingRef   = useRef<PendingBattle[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef  = useRef(false);
  // Keep userId/period/periodKey available to flush without adding to its deps
  const userIdRef    = useRef(userId);
  const periodRef    = useRef(period);
  const periodKeyRef = useRef(periodKey);

  useEffect(() => { rankingsRef.current  = rankings;  }, [rankings]);
  useEffect(() => { userIdRef.current    = userId;    }, [userId]);
  useEffect(() => { periodRef.current    = period;    }, [period]);
  useEffect(() => { periodKeyRef.current = periodKey; }, [periodKey]);

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
      setIndexError(null);
    } catch (err) {
      const url = extractIndexUrl(err);
      if (url) setIndexError(url);
      logError('Failed to load rankings/battles', 'useRankings.refresh', err);
    } finally {
      setLoading(false);
    }
  }, [period, periodKey]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Flush: write buffered battles to Firebase ────────────────────
  // Stable (empty deps) — safe to call from timers and cleanup effects.
  // Uses only refs so it never goes stale.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const flush = useCallback(async () => {
    if (flushingRef.current || pendingRef.current.length === 0) return;
    flushingRef.current = true;

    const batch = [...pendingRef.current];
    pendingRef.current = [];
    setPendingCount(0);

    try {
      // Write all battle records in parallel
      await Promise.all(batch.map(pb => battleRepository.create(pb.battleData)));

      // Upsert rankings: use the latest optimistic state for each affected game
      // so the final Firebase value is always the most up-to-date ELO.
      const affectedIds = new Set(batch.flatMap(pb => [pb.battleData.winnerId, pb.battleData.loserId]));
      await Promise.all(Array.from(affectedIds).map(gameId => {
        // Prefer the current optimistic state; fall back to the buffered snapshot
        const live = rankingsRef.current.find(r => r.gameId === gameId);
        const snap = batch.find(pb => pb.battleData.winnerId === gameId)?.winnerRank
                  ?? batch.find(pb => pb.battleData.loserId  === gameId)?.loserRank;
        const r = live ?? snap;
        if (!r) return Promise.resolve();
        return rankingRepository.upsert({
          gameId:       r.gameId,
          period:       periodRef.current,
          periodKey:    periodKeyRef.current,
          eloScore:     r.eloScore,
          wins:         r.wins,
          losses:       r.losses,
          battlesCount: r.battlesCount,
          lastBattleAt: r.lastBattleAt,
        });
      }));

      setIndexError(null);
    } catch (err) {
      // Re-queue on failure so data isn't lost
      pendingRef.current = [...batch, ...pendingRef.current];
      setPendingCount(pendingRef.current.length);
      const url = extractIndexUrl(err);
      if (url) setIndexError(url);
      logError('Failed to flush battles', 'useRankings.flush', err);
    } finally {
      flushingRef.current = false;
    }
  }, []); // stable — intentionally empty deps

  // Flush when period/user changes (don't lose queued data across navigation)
  useEffect(() => {
    flush();
  }, [period, periodKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush on unmount (user navigates away)
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flush();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── getBattleCount / getNextPair ─────────────────────────────────

  const getBattleCount = useCallback((id1: string, id2: string): number => {
    return battles.filter(b =>
      (b.winnerId === id1 && b.loserId === id2) ||
      (b.winnerId === id2 && b.loserId === id1)
    ).length;
  }, [battles]);

  const getNextPair = useCallback((eligibleIds: string[]): [string, string] | null => {
    if (eligibleIds.length < 2) return null;

    const pairKey = (a: string, b: string) => [a, b].sort().join('|');
    const pairCounts = new Map<string, number>();
    battles.forEach(b => {
      const k = pairKey(b.winnerId, b.loserId);
      pairCounts.set(k, (pairCounts.get(k) || 0) + 1);
    });

    const eloMap = new Map(rankings.map(r => [r.gameId, r.eloScore]));

    let bestPair: [string, string] | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < eligibleIds.length; i++) {
      for (let j = i + 1; j < eligibleIds.length; j++) {
        const a = eligibleIds[i];
        const b = eligibleIds[j];
        const count  = pairCounts.get(pairKey(a, b)) || 0;
        const eloDiff = Math.abs((eloMap.get(a) ?? INITIAL_ELO) - (eloMap.get(b) ?? INITIAL_ELO));
        const score  = count * 10000 + eloDiff;
        if (score < bestScore) { bestScore = score; bestPair = [a, b]; }
      }
    }

    return bestPair;
  }, [battles, rankings]);

  // ── recordBattle: instant local update + queued Firebase write ───

  const recordBattle = useCallback((winnerId: string, loserId: string) => {
    const now = new Date().toISOString();

    // Read from ref so rapid picks always see the latest ELOs (no stale closure)
    const existingWinner = rankingsRef.current.find(r => r.gameId === winnerId);
    const existingLoser  = rankingsRef.current.find(r => r.gameId === loserId);

    const winnerBase = existingWinner ?? {
      gameId: winnerId, period, periodKey,
      eloScore: INITIAL_ELO, wins: 0, losses: 0, battlesCount: 0, lastBattleAt: '',
    };
    const loserBase = existingLoser ?? {
      gameId: loserId, period, periodKey,
      eloScore: INITIAL_ELO, wins: 0, losses: 0, battlesCount: 0, lastBattleAt: '',
    };

    const { winnerChange, loserChange } = computeEloChanges(
      winnerBase.eloScore, loserBase.eloScore,
      winnerBase.battlesCount, loserBase.battlesCount,
    );

    // Optimistic local state — UI responds with zero Firebase latency
    setBattles(prev => [{
      id: `opt-${Date.now()}`,
      userId: userId || '',
      period, periodKey, winnerId, loserId,
      winnerEloChange: winnerChange,
      loserEloChange:  loserChange,
      battleDate: now, createdAt: now, updatedAt: now,
    } as RatingBattle, ...prev]);

    const newWinner: GameRanking = {
      id: existingWinner?.id ?? `opt-${winnerId}`,
      userId: userId || '',
      gameId: winnerId, period, periodKey,
      eloScore:     Math.max(100, winnerBase.eloScore + winnerChange),
      wins:         winnerBase.wins + 1,
      losses:       winnerBase.losses,
      battlesCount: winnerBase.battlesCount + 1,
      lastBattleAt: now,
      createdAt:  existingWinner?.createdAt ?? now,
      updatedAt:  now,
    };
    const newLoser: GameRanking = {
      id: existingLoser?.id ?? `opt-${loserId}`,
      userId: userId || '',
      gameId: loserId, period, periodKey,
      eloScore:     Math.max(100, loserBase.eloScore + loserChange),
      wins:         loserBase.wins,
      losses:       loserBase.losses + 1,
      battlesCount: loserBase.battlesCount + 1,
      lastBattleAt: now,
      createdAt:  existingLoser?.createdAt ?? now,
      updatedAt:  now,
    };

    setRankings(prev => {
      const next = [
        ...prev.filter(r => r.gameId !== winnerId && r.gameId !== loserId),
        newWinner, newLoser,
      ].sort((a, b) => b.eloScore - a.eloScore);
      rankingsRef.current = next; // keep ref in sync immediately
      return next;
    });

    // Add to write buffer
    pendingRef.current.push({
      battleData: {
        period, periodKey, winnerId, loserId,
        winnerEloChange: winnerChange,
        loserEloChange:  loserChange,
        battleDate: now,
      },
      winnerRank: {
        gameId: newWinner.gameId, period, periodKey,
        eloScore: newWinner.eloScore, wins: newWinner.wins, losses: newWinner.losses,
        battlesCount: newWinner.battlesCount, lastBattleAt: newWinner.lastBattleAt,
      },
      loserRank: {
        gameId: newLoser.gameId, period, periodKey,
        eloScore: newLoser.eloScore, wins: newLoser.wins, losses: newLoser.losses,
        battlesCount: newLoser.battlesCount, lastBattleAt: newLoser.lastBattleAt,
      },
    });
    setPendingCount(pendingRef.current.length);

    // Flush now if threshold reached, otherwise reset the idle timer
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    if (pendingRef.current.length >= FLUSH_AFTER_COUNT) {
      flush();
    } else {
      flushTimerRef.current = setTimeout(flush, FLUSH_IDLE_MS);
    }
  }, [userId, period, periodKey, flush]);

  return { rankings, battles, loading, pendingCount, indexError, recordBattle, flush, refresh, getBattleCount, getNextPair };
}
