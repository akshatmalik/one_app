'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'game-analytics-active-session';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  startTime: string; // ISO string — persists across refreshes
  thumbnail?: string;
}

interface UseActiveSessionReturn {
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  startSession: (game: { id: string; name: string; thumbnail?: string }) => void;
  stopSession: () => number | null; // returns fractional hours, null if nothing active
  abandonSession: () => void;
}

function loadSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: ActiveSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function secondsSince(isoTime: string): number {
  return Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000);
}

export function useActiveSession(): UseActiveSessionReturn {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(loadSession);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const s = loadSession();
    return s ? secondsSince(s.startTime) : 0;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep interval in sync with active session
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    // Sync immediately, then tick every second
    setElapsedSeconds(secondsSince(activeSession.startTime));
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(secondsSince(activeSession.startTime));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession]);

  const startSession = useCallback(
    (game: { id: string; name: string; thumbnail?: string }) => {
      const session: ActiveSession = {
        gameId: game.id,
        gameName: game.name,
        startTime: new Date().toISOString(),
        thumbnail: game.thumbnail,
      };
      saveSession(session);
      setActiveSession(session);
    },
    [],
  );

  const stopSession = useCallback((): number | null => {
    const current = activeSession;
    if (!current) return null;
    const hours = secondsSince(current.startTime) / 3600;
    saveSession(null);
    setActiveSession(null);
    return Math.max(hours, 1 / 60); // minimum 1 minute to avoid zero-duration logs
  }, [activeSession]);

  const abandonSession = useCallback(() => {
    saveSession(null);
    setActiveSession(null);
  }, []);

  return { activeSession, elapsedSeconds, startSession, stopSession, abandonSession };
}
