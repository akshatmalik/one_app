'use client';
import { useState, useEffect, useCallback } from 'react';

export interface LiveSession {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: string; // ISO string
}

const STORAGE_KEY = 'ga-live-session';

function loadFromStorage(): LiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LiveSession) : null;
  } catch {
    return null;
  }
}

function calcElapsed(startTime: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
}

export function useLiveSession() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Hydrate from localStorage on mount (survives page refreshes)
  useEffect(() => {
    const s = loadFromStorage();
    if (s) {
      setSession(s);
      setElapsedSeconds(calcElapsed(s.startTime));
    }
  }, []);

  // Tick every second while a session is active
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const startSession = useCallback((game: { id: string; name: string; thumbnail?: string }) => {
    const s: LiveSession = {
      gameId: game.id,
      gameName: game.name,
      thumbnail: game.thumbnail,
      startTime: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }
    setSession(s);
    setElapsedSeconds(0);
  }, []);

  // Returns elapsed seconds so caller can decide what to do with it
  const stopSession = useCallback((): number => {
    const elapsed = elapsedSeconds;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSession(null);
    setElapsedSeconds(0);
    return elapsed;
  }, [elapsedSeconds]);

  const cancelSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSession(null);
    setElapsedSeconds(0);
  }, []);

  return {
    session,
    elapsedSeconds,
    isActive: session !== null,
    startSession,
    stopSession,
    cancelSession,
  };
}
