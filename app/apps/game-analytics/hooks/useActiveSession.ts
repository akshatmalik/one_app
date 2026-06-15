'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startedAt: string; // ISO string
}

const STORAGE_KEY = 'ga-active-session';
const MAX_SESSION_HOURS = 24;

function loadSaved(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ActiveSession;
    const ageMs = Date.now() - new Date(s.startedAt).getTime();
    if (ageMs > MAX_SESSION_HOURS * 3_600_000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(loadSaved);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const s = loadSaved();
    if (!s) return 0;
    return Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
  });

  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }
    const startMs = new Date(session.startedAt).getTime();
    setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  const startSession = useCallback((gameId: string, gameName: string, gameThumbnail?: string) => {
    const s: ActiveSession = { gameId, gameName, gameThumbnail, startedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  // Returns the raw session + elapsed seconds so callers can pre-fill the log modal
  const endSession = useCallback((): { session: ActiveSession; rawSeconds: number } | null => {
    if (!session) return null;
    const rawSeconds = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const result = { session, rawSeconds };
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    return result;
  }, [session]);

  const cancelSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return { session, elapsedSeconds, startSession, endSession, cancelSession };
}
