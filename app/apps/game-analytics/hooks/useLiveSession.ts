'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'ga-live-session-v1';

export interface LiveSessionTarget {
  gameId: string;
  gameName: string;
  thumbnail?: string;
}

interface StoredLiveSession extends LiveSessionTarget {
  /** When the current unpaused stretch began (resets on resume). Used to compute live elapsed time. */
  startedAt: number;
  /** When the session was first started — never mutated by pause/resume. Used to date the logged PlayLog. */
  firstStartedAt: number;
  /** Milliseconds accumulated from all completed (paused) stretches before the current one. */
  accumulatedMs: number;
  isPaused: boolean;
}

function readStored(): StoredLiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLiveSession) : null;
  } catch {
    return null;
  }
}

function writeStored(session: StoredLiveSession | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export interface LiveSessionStopResult {
  elapsedMs: number;
  firstStartedAt: number;
}

/**
 * Tracks a single global active play-session timer, persisted to localStorage so it
 * survives tab switches and page reloads. Only one game can be timed at a time.
 */
export function useLiveSession() {
  const [session, setSession] = useState<StoredLiveSession | null>(() => readStored());
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session && !session.isPaused) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [session]);

  const elapsedMs = session
    ? session.accumulatedMs + (session.isPaused ? 0 : Math.max(0, now - session.startedAt))
    : 0;

  const start = useCallback((target: LiveSessionTarget) => {
    const ts = Date.now();
    const next: StoredLiveSession = {
      ...target,
      startedAt: ts,
      firstStartedAt: ts,
      accumulatedMs: 0,
      isPaused: false,
    };
    writeStored(next);
    setSession(next);
    setNow(ts);
  }, []);

  const pause = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.isPaused) return prev;
      const next: StoredLiveSession = {
        ...prev,
        accumulatedMs: prev.accumulatedMs + Math.max(0, Date.now() - prev.startedAt),
        isPaused: true,
      };
      writeStored(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setSession((prev) => {
      if (!prev || !prev.isPaused) return prev;
      const next: StoredLiveSession = { ...prev, startedAt: Date.now(), isPaused: false };
      writeStored(next);
      return next;
    });
  }, []);

  const stop = useCallback((): LiveSessionStopResult | null => {
    const prev = session;
    if (!prev) return null;
    const finalElapsedMs = prev.accumulatedMs + (prev.isPaused ? 0 : Math.max(0, Date.now() - prev.startedAt));
    writeStored(null);
    setSession(null);
    return { elapsedMs: finalElapsedMs, firstStartedAt: prev.firstStartedAt };
  }, [session]);

  const discard = useCallback(() => {
    writeStored(null);
    setSession(null);
  }, []);

  return {
    activeSession: session as LiveSessionTarget | null,
    isPaused: session?.isPaused ?? false,
    elapsedMs,
    start,
    pause,
    resume,
    stop,
    discard,
  };
}
