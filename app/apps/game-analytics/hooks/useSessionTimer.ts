'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'ga-session-timer';

export interface PersistedTimerState {
  gameId: string;
  gameName: string;
  startedAt: number;       // Date.now() when started
  pausedAt: number | null; // Date.now() when paused, null if running
  totalPausedMs: number;   // accumulated pause time in ms
}

export interface SessionTimerState extends PersistedTimerState {
  elapsedMs: number;
  isRunning: boolean;
  isPaused: boolean;
}

function loadTimer(): PersistedTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedTimerState) : null;
  } catch {
    return null;
  }
}

function saveTimer(state: PersistedTimerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearTimer(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

function computeElapsedMs(state: PersistedTimerState): number {
  if (state.pausedAt !== null) {
    return Math.max(0, state.pausedAt - state.startedAt - state.totalPausedMs);
  }
  return Math.max(0, Date.now() - state.startedAt - state.totalPausedMs);
}

export function useSessionTimer() {
  const [persisted, setPersisted] = useState<PersistedTimerState | null>(() => loadTimer());
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    const loaded = loadTimer();
    return loaded ? computeElapsedMs(loaded) : 0;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second while running; freeze when paused or no timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (persisted) {
      setElapsedMs(computeElapsedMs(persisted));
      if (persisted.pausedAt === null) {
        intervalRef.current = setInterval(() => {
          setElapsedMs(computeElapsedMs(persisted));
        }, 1000);
      }
    } else {
      setElapsedMs(0);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [persisted]);

  const start = useCallback((gameId: string, gameName: string) => {
    const state: PersistedTimerState = {
      gameId,
      gameName,
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
    };
    saveTimer(state);
    setPersisted(state);
  }, []);

  const pause = useCallback(() => {
    setPersisted(prev => {
      if (!prev || prev.pausedAt !== null) return prev;
      const updated: PersistedTimerState = { ...prev, pausedAt: Date.now() };
      saveTimer(updated);
      return updated;
    });
  }, []);

  const resume = useCallback(() => {
    setPersisted(prev => {
      if (!prev || prev.pausedAt === null) return prev;
      const pauseDuration = Date.now() - prev.pausedAt;
      const updated: PersistedTimerState = {
        ...prev,
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + pauseDuration,
      };
      saveTimer(updated);
      return updated;
    });
  }, []);

  // Returns elapsed hours at the moment of stopping (for pre-filling PlayLogModal)
  const stop = useCallback((): { gameId: string; gameName: string; hours: number } | null => {
    if (!persisted) return null;
    const elapsed = computeElapsedMs(persisted);
    const hours = Math.max(elapsed / 3_600_000, 0.01);
    clearTimer();
    setPersisted(null);
    return { gameId: persisted.gameId, gameName: persisted.gameName, hours };
  }, [persisted]);

  const discard = useCallback(() => {
    clearTimer();
    setPersisted(null);
  }, []);

  const timerState: SessionTimerState | null = persisted
    ? {
        ...persisted,
        elapsedMs,
        isRunning: persisted.pausedAt === null,
        isPaused: persisted.pausedAt !== null,
      }
    : null;

  return { state: timerState, start, pause, resume, stop, discard };
}
