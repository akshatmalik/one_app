'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface StoredSession {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startTime: number; // unix ms
  totalPausedMs: number;
  pausedAt?: number; // unix ms when paused; undefined if running
}

function getKey(uid: string) {
  return `ga-active-session-${uid}`;
}

function loadSession(uid: string): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getKey(uid));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function persistSession(uid: string, s: StoredSession | null) {
  if (typeof window === 'undefined') return;
  if (s) {
    localStorage.setItem(getKey(uid), JSON.stringify(s));
  } else {
    localStorage.removeItem(getKey(uid));
  }
}

export interface SessionTimerApi {
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  gameId: string | null;
  gameName: string | null;
  gameThumbnail: string | undefined;
  elapsedSeconds: number;
  start(gameId: string, gameName: string, thumbnail?: string): void;
  pause(): void;
  resume(): void;
  /** Stops the timer, clears state, and returns elapsed hours. */
  stop(): number;
  abandon(): void;
}

export function useSessionTimer(userId: string | null): SessionTimerApi {
  const uid = userId ?? 'local-user';
  const [session, setSession] = useState<StoredSession | null>(() => loadSession(uid));
  // Tick counter drives re-renders every second when running
  const [tick, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop the tick interval based on whether session is running
  useEffect(() => {
    if (session && !session.pausedAt) {
      tickRef.current = setInterval(() => setTick(n => n + 1), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [session?.gameId, session?.pausedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-load from localStorage if userId changes (auth state)
  useEffect(() => {
    const loaded = loadSession(uid);
    setSession(loaded);
  }, [uid]);

  const elapsedMs = (() => {
    if (!session) return 0;
    const now = session.pausedAt ?? Date.now();
    return Math.max(0, now - session.startTime - session.totalPausedMs);
  })();

  const start = useCallback(
    (gameId: string, gameName: string, thumbnail?: string) => {
      const s: StoredSession = {
        gameId,
        gameName,
        gameThumbnail: thumbnail,
        startTime: Date.now(),
        totalPausedMs: 0,
      };
      setSession(s);
      persistSession(uid, s);
    },
    [uid],
  );

  const pause = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.pausedAt) return prev;
      const next = { ...prev, pausedAt: Date.now() };
      persistSession(uid, next);
      return next;
    });
  }, [uid]);

  const resume = useCallback(() => {
    setSession(prev => {
      if (!prev || !prev.pausedAt) return prev;
      const extra = Date.now() - prev.pausedAt;
      const next = { ...prev, totalPausedMs: prev.totalPausedMs + extra, pausedAt: undefined };
      persistSession(uid, next);
      return next;
    });
  }, [uid]);

  const stop = useCallback((): number => {
    const s = loadSession(uid) ?? session; // re-read for accuracy
    if (!s) return 0;
    const now = s.pausedAt ?? Date.now();
    const ms = Math.max(0, now - s.startTime - s.totalPausedMs);
    persistSession(uid, null);
    setSession(null);
    return ms / 3_600_000;
  }, [session, uid]);

  const abandon = useCallback(() => {
    persistSession(uid, null);
    setSession(null);
  }, [uid]);

  return {
    isActive: !!session,
    isRunning: !!session && !session.pausedAt,
    isPaused: !!session && !!session.pausedAt,
    gameId: session?.gameId ?? null,
    gameName: session?.gameName ?? null,
    gameThumbnail: session?.gameThumbnail,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    start,
    pause,
    resume,
    stop,
    abandon,
  };
}
