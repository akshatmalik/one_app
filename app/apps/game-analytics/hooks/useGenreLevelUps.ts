'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Game } from '../lib/types';
import { getGenreMastery, GenreMasteryData, GenreRankTitle } from '../lib/calculations';

const STORAGE_KEY_PREFIX = 'game-analytics-genre-levels';

export interface GenreLevelUpEvent {
  genre: string;
  level: number;
  rank: GenreRankTitle;
  isMainClass: boolean;
  isRankUp: boolean; // rank title changed (e.g. Novice -> Apprentice), not just a level tick
}

interface LevelState {
  [genre: string]: { level: number; rank: GenreRankTitle };
}

/**
 * Mirrors useTrophies' earned-state-diffing pattern, but for Genre Mastery
 * classes: tracks each genre's last-seen level in localStorage and emits a
 * toast event the moment a genre's level (or rank title) ticks up.
 */
export function useGenreLevelUps(games: Game[], userId: string | null) {
  const storageKey = `${STORAGE_KEY_PREFIX}-${userId || 'local-user'}`;

  const [levelState, setLevelState] = useState<LevelState>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  });

  const [toastQueue, setToastQueue] = useState<GenreLevelUpEvent[]>([]);
  const initialLoadRef = useRef(true);
  // Ref mirrors levelState so the detection effect always sees the latest
  // value even when it runs multiple times before React commits state updates.
  const levelStateRef = useRef<LevelState>(levelState);

  const mastery: GenreMasteryData = useMemo(() => getGenreMastery(games), [games]);

  useEffect(() => {
    const current = levelStateRef.current;

    if (initialLoadRef.current) {
      // On first load, just sync state without toasts.
      initialLoadRef.current = false;
      const newState: LevelState = { ...current };
      let changed = false;

      for (const cls of mastery.classes) {
        if (!newState[cls.genre] || newState[cls.genre].level !== cls.level) {
          newState[cls.genre] = { level: cls.level, rank: cls.rank };
          changed = true;
        }
      }

      if (changed) {
        levelStateRef.current = newState;
        setLevelState(newState);
        try { localStorage.setItem(storageKey, JSON.stringify(newState)); } catch { /* ignore */ }
      }
      return;
    }

    // After initial load — detect genre level-ups.
    const newEvents: GenreLevelUpEvent[] = [];
    const newState: LevelState = { ...current };
    let changed = false;

    for (const cls of mastery.classes) {
      const prev = current[cls.genre];

      if (!prev) {
        // First time this genre appears this session (e.g. a newly added
        // game, or a bulk import) — track it silently, don't toast.
        newState[cls.genre] = { level: cls.level, rank: cls.rank };
        changed = true;
        continue;
      }

      if (cls.level > prev.level) {
        newState[cls.genre] = { level: cls.level, rank: cls.rank };
        changed = true;
        newEvents.push({
          genre: cls.genre,
          level: cls.level,
          rank: cls.rank,
          isMainClass: mastery.mainClass?.genre === cls.genre,
          isRankUp: cls.rank !== prev.rank,
        });
      }
    }

    if (changed) {
      levelStateRef.current = newState;
      setLevelState(newState);
      try { localStorage.setItem(storageKey, JSON.stringify(newState)); } catch { /* ignore */ }
    }
    if (newEvents.length > 0) {
      setToastQueue(prev => [...prev, ...newEvents]);
    }
  }, [mastery]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissToast = useCallback(() => {
    setToastQueue(prev => prev.slice(1));
  }, []);

  return { mastery, toastQueue, dismissToast };
}
