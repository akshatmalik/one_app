'use client';

import { useState, useCallback, useEffect } from 'react';
import { GameTier, TierAssignmentMap } from '../lib/types';

const STORAGE_PREFIX = 'game-analytics-tier-assignments';

function storageKey(userId: string | null, periodKey: string): string {
  return `${STORAGE_PREFIX}-${userId || 'local'}-${periodKey}`;
}

function load(userId: string | null, periodKey: string): TierAssignmentMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(userId, periodKey));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(userId: string | null, periodKey: string, map: TierAssignmentMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId, periodKey), JSON.stringify(map));
  } catch {
    // localStorage full — silently ignore
  }
}

export interface UseTierAssignmentsReturn {
  assignments: TierAssignmentMap;
  assignTier: (gameId: string, tier: GameTier) => void;
  removeTier: (gameId: string) => void;
  clearAll: () => void;
  bulkAssign: (map: TierAssignmentMap) => void;
  assignedCount: number;
  gamesInTier: (tier: GameTier) => string[];
}

export function useTierAssignments(
  userId: string | null,
  periodKey: string,
): UseTierAssignmentsReturn {
  const [assignments, setAssignments] = useState<TierAssignmentMap>(() =>
    load(userId, periodKey)
  );

  // Reload when period or user changes
  useEffect(() => {
    setAssignments(load(userId, periodKey));
  }, [userId, periodKey]);

  const assignTier = useCallback((gameId: string, tier: GameTier) => {
    setAssignments(prev => {
      const next = { ...prev, [gameId]: tier };
      save(userId, periodKey, next);
      return next;
    });
  }, [userId, periodKey]);

  const removeTier = useCallback((gameId: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[gameId];
      save(userId, periodKey, next);
      return next;
    });
  }, [userId, periodKey]);

  const clearAll = useCallback(() => {
    setAssignments({});
    save(userId, periodKey, {});
  }, [userId, periodKey]);

  const bulkAssign = useCallback((map: TierAssignmentMap) => {
    setAssignments(map);
    save(userId, periodKey, map);
  }, [userId, periodKey]);

  const gamesInTier = useCallback((tier: GameTier): string[] => {
    return Object.entries(assignments)
      .filter(([, t]) => t === tier)
      .map(([id]) => id);
  }, [assignments]);

  return {
    assignments,
    assignTier,
    removeTier,
    clearAll,
    bulkAssign,
    assignedCount: Object.keys(assignments).length,
    gamesInTier,
  };
}
