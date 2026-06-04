'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startedAt: number;       // unix ms
  pausedAt: number | null; // unix ms if paused, null if running
  totalPausedMs: number;   // accumulated pause duration
}

const KEY_PREFIX = 'ga-active-session';

export function useActiveSession(userId: string | null) {
  const key = `${KEY_PREFIX}-${userId || 'local-user'}`;

  const [session, setSession] = useState<ActiveSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as ActiveSession) : null;
    } catch { return null; }
  });

  // Tick counter — forces re-render every second so the elapsed display updates.
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session && !session.pausedAt) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [session?.gameId, session?.pausedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((s: ActiveSession | null) => {
    if (typeof window !== 'undefined') {
      if (s === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(s));
    }
    setSession(s);
  }, [key]);

  // Elapsed seconds, accounting for pauses
  const elapsedSeconds = session
    ? Math.max(0, Math.floor(
        ((session.pausedAt ?? Date.now()) - session.startedAt - session.totalPausedMs) / 1000
      ))
    : 0;

  // Rounded to nearest 0.25h for logging (minimum 0.25h)
  const elapsedHours = Math.max(0.25, Math.round((elapsedSeconds / 3600) * 4) / 4);

  const startSession = useCallback((gameId: string, gameName: string, thumbnail?: string) => {
    persist({
      gameId,
      gameName,
      thumbnail,
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
    });
  }, [persist]);

  const pauseSession = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.pausedAt !== null) return prev;
      const updated = { ...prev, pausedAt: Date.now() };
      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [key]);

  const resumeSession = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.pausedAt === null) return prev;
      const addedPause = Date.now() - prev.pausedAt;
      const updated = { ...prev, pausedAt: null, totalPausedMs: prev.totalPausedMs + addedPause };
      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [key]);

  // Returns elapsed hours so the caller can log them, then clears the session.
  const stopSession = useCallback((): number => {
    const hours = Math.max(0.25, Math.round((elapsedSeconds / 3600) * 4) / 4);
    persist(null);
    return hours;
  }, [elapsedSeconds, persist]);

  const discardSession = useCallback(() => {
    persist(null);
  }, [persist]);

  return {
    activeSession: session,
    elapsedSeconds,
    elapsedHours,
    isActive: session !== null,
    isPaused: session !== null && session.pausedAt !== null,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    discardSession,
  };
}
