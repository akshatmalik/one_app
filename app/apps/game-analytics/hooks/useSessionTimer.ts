'use client';

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'ga-live-session';

export interface LiveSession {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startTime: number; // Date.now() ms
}

export function useSessionTimer() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore any in-progress session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: LiveSession = JSON.parse(raw);
        if (saved?.startTime) {
          setSession(saved);
          setElapsedSecs(Math.max(0, Math.floor((Date.now() - saved.startTime) / 1000)));
        }
      }
    } catch {}
  }, []);

  // Tick every second while session is running
  useEffect(() => {
    if (!session) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - session.startTime) / 1000)));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  function startSession(game: { id: string; name: string; thumbnail?: string }) {
    const newSession: LiveSession = {
      gameId: game.id,
      gameName: game.name,
      gameThumbnail: game.thumbnail,
      startTime: Date.now(),
    };
    setSession(newSession);
    setElapsedSecs(0);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession)); } catch {}
  }

  function clearSession() {
    setSession(null);
    setElapsedSecs(0);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const displayH = Math.floor(elapsedSecs / 3600);
  const displayM = Math.floor((elapsedSecs % 3600) / 60);
  const displayS = elapsedSecs % 60;
  const elapsedHours = Math.round((elapsedSecs / 3600) * 10) / 10;

  return {
    session,
    elapsedSecs,
    elapsedHours,
    displayH,
    displayM,
    displayS,
    startSession,
    clearSession,
  };
}
