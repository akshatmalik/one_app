'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LiveSession {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: string; // ISO timestamp
}

function storageKey(uid: string) {
  return `ga-live-session-${uid}`;
}

function loadSession(uid: string): LiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as LiveSession) : null;
  } catch { return null; }
}

function persistSession(uid: string, session: LiveSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(storageKey(uid), JSON.stringify(session));
    } else {
      localStorage.removeItem(storageKey(uid));
    }
  } catch {}
}

export function useLiveSession(userId: string | null) {
  const uid = userId || 'local-user';
  const [session, setSession] = useState<LiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load persisted session on mount or user change
  useEffect(() => {
    const saved = loadSession(uid);
    if (saved) {
      setSession(saved);
      const elapsed = Math.floor((Date.now() - new Date(saved.startTime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    } else {
      setSession(null);
      setElapsedSeconds(0);
    }
  }, [uid]);

  // Live ticker — updates every second when a session is active
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const startSession = useCallback((game: { id: string; name: string; thumbnail?: string }) => {
    const newSession: LiveSession = {
      gameId: game.id,
      gameName: game.name,
      thumbnail: game.thumbnail,
      startTime: new Date().toISOString(),
    };
    setSession(newSession);
    setElapsedSeconds(0);
    persistSession(uid, newSession);
  }, [uid]);

  const clearSession = useCallback(() => {
    setSession(null);
    setElapsedSeconds(0);
    persistSession(uid, null);
  }, [uid]);

  /** Returns hours played rounded to 2 decimal places — call at the moment of stopping */
  const getSessionHours = useCallback((): number => {
    if (!session) return 0;
    const ms = Date.now() - new Date(session.startTime).getTime();
    return Math.max(0.1, Math.round((ms / (1000 * 60 * 60)) * 100) / 100);
  }, [session]);

  return { session, elapsedSeconds, startSession, clearSession, getSessionHours };
}
