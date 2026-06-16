'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../lib/types';

const STORAGE_KEY = 'ga-active-session';

export interface ActiveSessionState {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: number;      // Unix ms when the timer was started (or resumed)
  pausedAt?: number;      // Unix ms when paused; undefined = running
  totalPausedMs: number;  // Accumulated pause duration so far
}

export interface UseActiveSessionReturn {
  activeSession: ActiveSessionState | null;
  elapsedMs: number;
  elapsedHours: number;
  isPaused: boolean;
  start: (game: Game) => void;
  pause: () => void;
  resume: () => void;
  stop: () => number;   // returns rounded hours logged
  cancel: () => void;
}

export function useActiveSession(): UseActiveSessionReturn {
  const [session, setSession] = useState<ActiveSessionState | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ActiveSessionState) : null;
    } catch { return null; }
  });

  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeElapsed = useCallback((s: ActiveSessionState): number => {
    const wall = s.pausedAt
      ? s.pausedAt - s.startTime
      : Date.now() - s.startTime;
    return Math.max(0, wall - s.totalPausedMs);
  }, []);

  // Drive the live counter
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!session) { setElapsedMs(0); return; }
    if (session.pausedAt) { setElapsedMs(computeElapsed(session)); return; }

    // Sync on mount so the display is instant
    setElapsedMs(computeElapsed(session));
    intervalRef.current = setInterval(() => {
      setElapsedMs(computeElapsed(session));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session, computeElapsed]);

  const persist = useCallback((s: ActiveSessionState | null) => {
    if (typeof window !== 'undefined') {
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else localStorage.removeItem(STORAGE_KEY);
    }
    setSession(s);
  }, []);

  const start = useCallback((game: Game) => {
    persist({
      gameId: game.id,
      gameName: game.name,
      thumbnail: game.thumbnail,
      startTime: Date.now(),
      totalPausedMs: 0,
    });
  }, [persist]);

  const pause = useCallback(() => {
    if (!session || session.pausedAt) return;
    persist({ ...session, pausedAt: Date.now() });
  }, [session, persist]);

  const resume = useCallback(() => {
    if (!session || !session.pausedAt) return;
    const extra = Date.now() - session.pausedAt;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pausedAt: _drop, ...rest } = session;
    persist({ ...rest, totalPausedMs: session.totalPausedMs + extra });
  }, [session, persist]);

  const stop = useCallback((): number => {
    if (!session) return 0;
    const ms = computeElapsed(session);
    persist(null);
    return Math.max(0.1, Math.round((ms / (1000 * 3600)) * 10) / 10);
  }, [session, computeElapsed, persist]);

  const cancel = useCallback(() => { persist(null); }, [persist]);

  return {
    activeSession: session,
    elapsedMs,
    elapsedHours: elapsedMs / (1000 * 3600),
    isPaused: !!session?.pausedAt,
    start,
    pause,
    resume,
    stop,
    cancel,
  };
}
