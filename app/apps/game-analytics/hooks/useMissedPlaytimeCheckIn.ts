'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Game } from '../lib/types';
import {
  discoverUnloggedDates,
  MissedCheckInState,
  resolveCheckInDates,
  toLocalDateString,
} from '../lib/missed-check-in';

const STORAGE_PREFIX = 'game-analytics-missed-check-in';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}-${userId || 'local-user'}`;
}

function readState(key: string): MissedCheckInState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MissedCheckInState>;
    if (!Array.isArray(parsed.unresolvedDates)) return null;
    return {
      unresolvedDates: parsed.unresolvedDates.filter((date): date is string => typeof date === 'string'),
    };
  } catch {
    return null;
  }
}

function writeState(key: string, state: MissedCheckInState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // The reminder is best-effort; play logs still persist through the repository.
  }
}

export function useMissedPlaytimeCheckIn(userId: string, games: Game[], ready: boolean) {
  const key = useMemo(() => storageKey(userId), [userId]);
  const [state, setState] = useState<MissedCheckInState | null>(null);
  const [postponedForVisit, setPostponedForVisit] = useState(false);

  useEffect(() => {
    if (ready) setPostponedForVisit(false);
  }, [key, ready]);

  useEffect(() => {
    if (!ready) return;
    const next = discoverUnloggedDates(readState(key), games, toLocalDateString());
    writeState(key, next);
    setState(next);
  }, [games, key, ready]);

  const postpone = useCallback(() => {
    setPostponedForVisit(true);
  }, []);

  const resolveDates = useCallback((dates: string[]) => {
    setState(current => {
      if (!current) return current;
      const next = resolveCheckInDates(current, dates);
      writeState(key, next);
      return next;
    });
  }, [key]);

  return {
    pendingDates: state?.unresolvedDates ?? [],
    shouldPrompt: ready && !postponedForVisit && (state?.unresolvedDates.length ?? 0) > 0,
    postpone,
    resolveDates,
  };
}
