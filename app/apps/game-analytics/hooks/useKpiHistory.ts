'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Game } from '../lib/types';
import {
  getGamingCreditScore,
  getLibraryHealth,
  calculateSummary,
  getGenreDiversity,
  getGamingVelocity,
  getAllPlayLogs,
  parseLocalDate,
} from '../lib/calculations';
import { recordKpiSnapshot, getKpiHistory, KpiSnapshot } from '../lib/kpi-history-storage';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useKpiHistory(games: Game[], userId: string) {
  const [history, setHistory] = useState<KpiSnapshot[]>([]);

  const today: KpiSnapshot | null = useMemo(() => {
    if (games.length === 0) return null;
    const credit = getGamingCreditScore(games);
    const health = getLibraryHealth(games);
    const summary = calculateSummary(games);

    // Mirrors the raw-value formulas in getPopulationBenchmarks() so its
    // dimensions can be charted over time from this same snapshot log.
    const ownedGames = games.filter(g => g.status !== 'Wishlist');
    const backlogSize = ownedGames.filter(g => g.status === 'Not Started').length;
    const genreDiversity = getGenreDiversity(games).uniqueGenres;
    const hoursPerWeek = getGamingVelocity(games, 90) * 7;
    const purchaseYears = new Set(
      ownedGames.filter(g => g.datePurchased).map(g => g.datePurchased!.split('-')[0])
    );
    const yearlySpend = summary.totalSpent / Math.max(1, purchaseYears.size);
    const startedGames = ownedGames.filter(g => g.datePurchased && g.startDate);
    const firstPlayDays = startedGames.length > 0
      ? startedGames.reduce((sum, g) => {
          const purchased = parseLocalDate(g.datePurchased!).getTime();
          const started = parseLocalDate(g.startDate!).getTime();
          return sum + Math.max(0, (started - purchased) / (1000 * 60 * 60 * 24));
        }, 0) / startedGames.length
      : 0;
    const allLogs = getAllPlayLogs(games);
    const sessionLengthHours = allLogs.length > 0
      ? allLogs.reduce((sum, l) => sum + l.log.hours, 0) / allLogs.length
      : 0;

    return {
      date: todayStr(),
      creditScore: credit.score,
      costPerHour: Math.round(summary.averageCostPerHour * 100) / 100,
      completionRate: summary.completionRate,
      totalHours: Math.round(summary.totalHours),
      totalSpent: Math.round(summary.totalSpent),
      librarySize: summary.totalGames,
      avgRating: Math.round(summary.averageRating * 10) / 10,
      activeRate: health.activeRate,
      backlogSize,
      hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
      genreDiversity,
      yearlySpend: Math.round(yearlySpend),
      firstPlayDays: Math.round(firstPlayDays),
      sessionLengthHours: Math.round(sessionLengthHours * 10) / 10,
    };
  }, [games]);

  // Only persist once per calendar day per snapshot content to avoid redundant writes on every render.
  const lastRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!today) return;
    const fingerprint = JSON.stringify(today);
    if (lastRecordedRef.current === fingerprint) return;
    lastRecordedRef.current = fingerprint;
    recordKpiSnapshot(userId, today);
    setHistory(getKpiHistory(userId));
  }, [today, userId]);

  return { history, today };
}
