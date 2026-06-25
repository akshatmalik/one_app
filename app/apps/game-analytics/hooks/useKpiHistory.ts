'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Game } from '../lib/types';
import { getGamingCreditScore, getLibraryHealth, calculateSummary } from '../lib/calculations';
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
