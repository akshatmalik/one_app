'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Game } from '../lib/types';
import { evaluateAllTrophies, getTrophyScoreSummary, TrophyProgress } from '../lib/trophy-calculations';
import { TrophyTierLevel } from '../lib/trophy-definitions';

const STORAGE_KEY_PREFIX = 'game-analytics-trophies-earned';
const PINNED_KEY_PREFIX = 'game-analytics-trophies-pinned';

interface NewTrophyEvent {
  trophyId: string;
  name: string;
  icon: string;
  tier: TrophyTierLevel | 'milestone';
  isUpgrade: boolean; // true if tier upgraded, not newly earned
}

interface EarnedState {
  [trophyId: string]: {
    tier: TrophyTierLevel | 'milestone';
    earnedAt: string;
  };
}

export function useTrophies(games: Game[], userId: string | null) {
  const storageKey = `${STORAGE_KEY_PREFIX}-${userId || 'local-user'}`;
  const pinnedKey = `${PINNED_KEY_PREFIX}-${userId || 'local-user'}`;

  // Load saved earned state
  const [earnedState, setEarnedState] = useState<EarnedState>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  });

  // Pinned trophy IDs
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(pinnedKey);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  });

  // Queue of newly earned trophies for toast notifications
  const [toastQueue, setToastQueue] = useState<NewTrophyEvent[]>([]);
  const initialLoadRef = useRef(true);
  // Ref mirrors earnedState so the detection effect always sees the latest
  // value even when it runs multiple times before React commits state updates.
  const earnedStateRef = useRef<EarnedState>(earnedState);

  // Evaluate all trophies
  const allTrophies = useMemo(() => evaluateAllTrophies(games), [games]);

  // Fix trophy-hunter: check after evaluation
  const trophiesWithHunter = useMemo(() => {
    const earnedCount = allTrophies.filter(t => t.earned && t.definition.id !== 'trophy-hunter').length;
    return allTrophies.map(t => {
      if (t.definition.id === 'trophy-hunter') {
        return {
          ...t,
          earned: earnedCount >= 50,
          currentValue: earnedCount,
          currentTier: earnedCount >= 50 ? 'gold' as TrophyTierLevel : null,
          progress: Math.min(100, (earnedCount / 50) * 100),
          points: earnedCount >= 50 ? 50 : 0,
        };
      }
      return t;
    });
  }, [allTrophies]);

  const summary = useMemo(() => getTrophyScoreSummary(trophiesWithHunter), [trophiesWithHunter]);

  // Detect newly earned trophies and tier upgrades
  useEffect(() => {
    // Always read from the ref so rapid re-runs don't use a stale snapshot
    const currentEarned = earnedStateRef.current;

    if (initialLoadRef.current) {
      // On first load, just sync state without toasts
      initialLoadRef.current = false;
      const newState: EarnedState = { ...currentEarned };
      let changed = false;

      for (const t of trophiesWithHunter) {
        if (t.earned && t.currentTier) {
          const key = t.definition.id;
          if (!newState[key]) {
            newState[key] = { tier: t.definition.isMilestone ? 'milestone' : t.currentTier, earnedAt: new Date().toISOString() };
            changed = true;
          } else if (!t.definition.isMilestone && t.currentTier !== newState[key].tier) {
            // Tier upgraded
            newState[key] = { tier: t.currentTier, earnedAt: new Date().toISOString() };
            changed = true;
          }
        }
      }

      if (changed) {
        earnedStateRef.current = newState;
        setEarnedState(newState);
        localStorage.setItem(storageKey, JSON.stringify(newState));
      }
      return;
    }

    // After initial load — detect new trophies and show toasts
    const newEvents: NewTrophyEvent[] = [];
    const newState: EarnedState = { ...currentEarned };
    let changed = false;

    for (const t of trophiesWithHunter) {
      if (!t.earned || !t.currentTier) continue;
      const key = t.definition.id;
      const prev = currentEarned[key];

      if (!prev) {
        // Newly earned
        newState[key] = { tier: t.definition.isMilestone ? 'milestone' : t.currentTier, earnedAt: new Date().toISOString() };
        changed = true;
        newEvents.push({
          trophyId: key,
          name: t.definition.name,
          icon: t.definition.icon,
          tier: t.definition.isMilestone ? 'milestone' : t.currentTier,
          isUpgrade: false,
        });
      } else if (!t.definition.isMilestone && t.currentTier !== prev.tier) {
        // Tier upgrade
        newState[key] = { tier: t.currentTier, earnedAt: new Date().toISOString() };
        changed = true;
        newEvents.push({
          trophyId: key,
          name: t.definition.name,
          icon: t.definition.icon,
          tier: t.currentTier,
          isUpgrade: true,
        });
      }
    }

    if (changed) {
      earnedStateRef.current = newState;
      setEarnedState(newState);
      localStorage.setItem(storageKey, JSON.stringify(newState));
    }
    if (newEvents.length > 0) {
      setToastQueue(prev => [...prev, ...newEvents]);
    }
  }, [trophiesWithHunter]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissToast = useCallback(() => {
    setToastQueue(prev => prev.slice(1));
  }, []);

  const togglePin = useCallback((trophyId: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(trophyId)
        ? prev.filter(id => id !== trophyId)
        : prev.length < 5 ? [...prev, trophyId] : prev;
      localStorage.setItem(pinnedKey, JSON.stringify(next));
      return next;
    });
  }, [pinnedKey]);

  // Get pinned trophies
  const pinnedTrophies = useMemo(() => {
    return pinnedIds
      .map(id => trophiesWithHunter.find(t => t.definition.id === id))
      .filter((t): t is TrophyProgress => !!t && t.earned);
  }, [pinnedIds, trophiesWithHunter]);

  return {
    allTrophies: trophiesWithHunter,
    summary,
    pinnedTrophies,
    pinnedIds,
    togglePin,
    toastQueue,
    dismissToast,
    earnedState,
  };
}
