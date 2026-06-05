'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LiveSession {
  gameId: string;
  startedAt: number; // epoch ms
}

function storageKey(userId: string | null) {
  return `ga-live-session-${userId ?? 'anon'}`;
}

function read(userId: string | null): LiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as LiveSession) : null;
  } catch {
    return null;
  }
}

function write(userId: string | null, session: LiveSession | null) {
  if (typeof window === 'undefined') return;
  try {
    const key = storageKey(userId);
    if (session) localStorage.setItem(key, JSON.stringify(session));
    else localStorage.removeItem(key);
  } catch {}
}

export function useLiveSession(userId: string | null) {
  const [session, setSession] = useState<LiveSession | null>(() => read(userId));
  // tick forces re-render every second while a session is active
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reload session if userId changes (auth state switch)
  useEffect(() => {
    const loaded = read(userId);
    setSession(loaded);
  }, [userId]);

  // Start / stop the 1-second ticker
  useEffect(() => {
    if (session) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.gameId, session?.startedAt]);

  const elapsedMs = session ? Math.max(0, Date.now() - session.startedAt) : 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedHours = elapsedMs / 3_600_000;

  const startSession = useCallback(
    (gameId: string) => {
      const s: LiveSession = { gameId, startedAt: Date.now() };
      write(userId, s);
      setSession(s);
      setTick(0);
    },
    [userId],
  );

  // Returns the rounded hours logged; caller is responsible for saving the play log
  const endSession = useCallback((): number => {
    if (!session) return 0;
    const raw = elapsedMs / 3_600_000;
    const hours = Math.max(0.1, Math.round(raw * 10) / 10);
    write(userId, null);
    setSession(null);
    return hours;
  }, [session, elapsedMs, userId]);

  const clearSession = useCallback(() => {
    write(userId, null);
    setSession(null);
  }, [userId]);

  return { session, elapsedSeconds, elapsedHours, startSession, endSession, clearSession };
}
