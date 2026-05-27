'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ActiveSession {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: number;       // unix ms when session started
  totalPausedMs: number;   // accumulated paused ms
  pausedAt?: number;       // unix ms when current pause started (if paused)
}

function getKey(userId: string | null): string {
  return `ga-live-session-${userId || 'local'}`;
}

function computeElapsed(s: ActiveSession): number {
  const now = Date.now();
  let ms = now - s.startTime - s.totalPausedMs;
  if (s.pausedAt) ms -= now - s.pausedAt;
  return Math.max(0, Math.floor(ms / 1000));
}

function loadFromStorage(userId: string | null): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

function saveToStorage(userId: string | null, session: ActiveSession | null): void {
  if (typeof window === 'undefined') return;
  const k = getKey(userId);
  try {
    if (session) localStorage.setItem(k, JSON.stringify(session));
    else localStorage.removeItem(k);
  } catch {}
}

export function useLiveSession(userId: string | null) {
  const [session, setSessionRaw] = useState<ActiveSession | null>(() =>
    loadFromStorage(userId)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Persist + set helper
  const setSession = useCallback((
    updater: ActiveSession | null | ((prev: ActiveSession | null) => ActiveSession | null)
  ) => {
    setSessionRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(userIdRef.current, next);
      return next;
    });
  }, []);

  // Tick management
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!session) {
      setElapsedSeconds(0);
      return;
    }
    if (session.pausedAt) {
      setElapsedSeconds(computeElapsed(session));
      return;
    }
    setElapsedSeconds(computeElapsed(session));
    tickRef.current = setInterval(
      () => setElapsedSeconds(s => s + 1),
      1000
    );
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [session]);

  // Reload when userId changes (login/logout)
  useEffect(() => {
    setSessionRaw(loadFromStorage(userId));
  }, [userId]);

  const startSession = useCallback((
    gameId: string,
    gameName: string,
    thumbnail?: string
  ) => {
    const s: ActiveSession = {
      gameId,
      gameName,
      thumbnail,
      startTime: Date.now(),
      totalPausedMs: 0,
    };
    setSession(s);
  }, [setSession]);

  const pauseSession = useCallback(() => {
    setSession(prev => {
      if (!prev || prev.pausedAt) return prev;
      return { ...prev, pausedAt: Date.now() };
    });
  }, [setSession]);

  const resumeSession = useCallback(() => {
    setSession(prev => {
      if (!prev?.pausedAt) return prev;
      return {
        ...prev,
        totalPausedMs: prev.totalPausedMs + (Date.now() - prev.pausedAt),
        pausedAt: undefined,
      };
    });
  }, [setSession]);

  // Returns the logged result and clears the session
  const stopSession = useCallback((): { gameId: string; hours: number } | null => {
    if (!session) return null;
    const elapsed = computeElapsed(session);
    // Round to nearest 0.1h, minimum 0.1h
    const hours = Math.max(0.1, Math.round(elapsed / 360) / 10);
    const result = { gameId: session.gameId, hours };
    setSession(null);
    return result;
  }, [session, setSession]);

  const cancelSession = useCallback(() => {
    setSession(null);
  }, [setSession]);

  return {
    activeSession: session,
    elapsedSeconds,
    isPaused: !!session?.pausedAt,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    cancelSession,
  };
}
