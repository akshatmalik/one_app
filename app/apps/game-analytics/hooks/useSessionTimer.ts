'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from '../lib/types';

export interface ActiveSession {
  game: Game;
  startedAt: number; // Unix timestamp ms
}

export interface SessionTimerState {
  isActive: boolean;
  session: ActiveSession | null;
  elapsedSeconds: number;
  sessionHours: number;
  startSession: (game: Game) => void;
  stopSession: () => { hours: number; game: Game } | null;
  cancelSession: () => void;
}

const STORAGE_KEY = 'ga-active-session';

export function useSessionTimer(): SessionTimerState {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore session from sessionStorage on mount (survives tab switches)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveSession;
        // Validate: must have a game id and a reasonable startedAt
        if (parsed?.game?.id && typeof parsed.startedAt === 'number') {
          setSession(parsed);
        }
      }
    } catch {
      // corrupt storage — ignore
    }
  }, []);

  // Tick every second while active
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!session) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)));
    };

    tick(); // immediate first tick
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session]);

  const startSession = useCallback((game: Game) => {
    const s: ActiveSession = { game, startedAt: Date.now() };
    setSession(s);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, []);

  const stopSession = useCallback((): { hours: number; game: Game } | null => {
    if (!session) return null;
    const rawHours = elapsedSeconds / 3600;
    const hours = Math.max(rawHours, 1 / 60); // minimum 1 minute
    const result = { hours, game: session.game };
    setSession(null);
    setElapsedSeconds(0);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    return result;
  }, [session, elapsedSeconds]);

  const cancelSession = useCallback(() => {
    setSession(null);
    setElapsedSeconds(0);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    isActive: !!session,
    session,
    elapsedSeconds,
    sessionHours: elapsedSeconds / 3600,
    startSession,
    stopSession,
    cancelSession,
  };
}
