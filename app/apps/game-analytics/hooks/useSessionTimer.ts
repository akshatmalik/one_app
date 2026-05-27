'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ga-live-session';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startTime: string; // ISO string
}

function loadSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: ActiveSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function getElapsedSeconds(startTime: string): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
}

export function useSessionTimer() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds

  // Restore session from localStorage on mount (handles page refresh)
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setElapsed(getElapsedSeconds(stored.startTime));
    }
  }, []);

  // Tick once per second while a session is active
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const start = useCallback((gameId: string, gameName: string, gameThumbnail?: string) => {
    const newSession: ActiveSession = {
      gameId,
      gameName,
      gameThumbnail,
      startTime: new Date().toISOString(),
    };
    setSession(newSession);
    setElapsed(0);
    saveSession(newSession);
  }, []);

  // Returns the completed session data and clears state
  const stop = useCallback((): { hoursRaw: number; session: ActiveSession } | null => {
    if (!session) return null;
    const hoursRaw = elapsed / 3600;
    const result = { hoursRaw, session };
    setSession(null);
    setElapsed(0);
    saveSession(null);
    return result;
  }, [session, elapsed]);

  const abandon = useCallback(() => {
    setSession(null);
    setElapsed(0);
    saveSession(null);
  }, []);

  return { session, elapsed, isRunning: !!session, start, stop, abandon };
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function roundToLogHours(seconds: number): number {
  // Round to nearest 0.1h, minimum 0.1h
  return Math.max(0.1, Math.round(seconds / 360) / 10);
}
