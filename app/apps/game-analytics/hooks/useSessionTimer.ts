'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'game-analytics-live-session';

export interface LiveSession {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startedAt: number;     // ms timestamp
  pausedAt?: number;     // ms timestamp, present when paused
  totalPausedMs: number; // accumulated paused duration
}

function calcElapsed(s: LiveSession): number {
  const end = s.pausedAt ?? Date.now();
  return Math.max(0, Math.floor((end - s.startedAt - s.totalPausedMs) / 1000));
}

export function useSessionTimer() {
  const [session, setSession] = useState<LiveSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as LiveSession) : null;
    } catch {
      return null;
    }
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return 0;
      return calcElapsed(JSON.parse(raw) as LiveSession);
    } catch {
      return 0;
    }
  });

  // Tick every second when session is active and not paused
  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(calcElapsed(session));
    if (session.pausedAt != null) return;

    const id = setInterval(() => {
      setElapsedSeconds(calcElapsed(session));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  const persist = useCallback((s: LiveSession | null) => {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore storage errors */ }
    setSession(s);
  }, []);

  const startSession = useCallback((
    gameId: string,
    gameName: string,
    thumbnail?: string,
  ) => {
    persist({
      gameId,
      gameName,
      gameThumbnail: thumbnail,
      startedAt: Date.now(),
      totalPausedMs: 0,
    });
  }, [persist]);

  const pauseSession = useCallback(() => {
    if (!session || session.pausedAt != null) return;
    persist({ ...session, pausedAt: Date.now() });
  }, [session, persist]);

  const resumeSession = useCallback(() => {
    if (!session || session.pausedAt == null) return;
    const extra = Date.now() - session.pausedAt;
    persist({
      gameId: session.gameId,
      gameName: session.gameName,
      gameThumbnail: session.gameThumbnail,
      startedAt: session.startedAt,
      totalPausedMs: session.totalPausedMs + extra,
    });
  }, [session, persist]);

  const cancelSession = useCallback(() => {
    persist(null);
  }, [persist]);

  return {
    session,
    elapsedSeconds,
    isPaused: session?.pausedAt != null,
    isActive: session != null,
    startSession,
    pauseSession,
    resumeSession,
    cancelSession,
  };
}
