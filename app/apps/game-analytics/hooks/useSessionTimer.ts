'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'ga-session-timer';

interface TimerPersistence {
  gameId: string;
  gameName: string;
  gameThumbnail?: string;
  startTime: number;      // ms epoch — start of current running period
  pausedAt?: number;      // ms epoch — when paused (undefined if running)
  accumulatedMs: number;  // ms from all previous running periods
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface SessionTimerState {
  status: TimerStatus;
  gameId: string | null;
  gameName: string | null;
  gameThumbnail?: string;
  elapsedSeconds: number;
}

function loadPersistence(): TimerPersistence | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePersistence(data: TimerPersistence | null) {
  if (typeof window === 'undefined') return;
  try {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function computeElapsed(p: TimerPersistence): number {
  const runUntil = p.pausedAt ?? Date.now();
  return Math.floor((p.accumulatedMs + Math.max(0, runUntil - p.startTime)) / 1000);
}

export function useSessionTimer() {
  const persistRef = useRef<TimerPersistence | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timerState, setTimerState] = useState<SessionTimerState>({
    status: 'idle',
    gameId: null,
    gameName: null,
    elapsedSeconds: 0,
  });

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      const p = persistRef.current;
      if (!p || p.pausedAt) return;
      setTimerState(prev => ({ ...prev, elapsedSeconds: computeElapsed(p) }));
    }, 1000);
  }, [stopInterval]);

  // Restore from localStorage on mount
  useEffect(() => {
    const p = loadPersistence();
    if (!p) return;
    persistRef.current = p;
    const elapsed = computeElapsed(p);
    const isRunning = !p.pausedAt;
    setTimerState({
      status: isRunning ? 'running' : 'paused',
      gameId: p.gameId,
      gameName: p.gameName,
      gameThumbnail: p.gameThumbnail,
      elapsedSeconds: elapsed,
    });
    if (isRunning) startInterval();
    return stopInterval;
  // startInterval and stopInterval are stable refs — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = useCallback((game: { id: string; name: string; thumbnail?: string }) => {
    stopInterval();
    const p: TimerPersistence = {
      gameId: game.id,
      gameName: game.name,
      gameThumbnail: game.thumbnail,
      startTime: Date.now(),
      accumulatedMs: 0,
    };
    savePersistence(p);
    persistRef.current = p;
    setTimerState({
      status: 'running',
      gameId: game.id,
      gameName: game.name,
      gameThumbnail: game.thumbnail,
      elapsedSeconds: 0,
    });
    startInterval();
  }, [stopInterval, startInterval]);

  const pauseTimer = useCallback(() => {
    const p = persistRef.current;
    if (!p || p.pausedAt) return;
    const now = Date.now();
    const updated: TimerPersistence = {
      ...p,
      accumulatedMs: p.accumulatedMs + Math.max(0, now - p.startTime),
      startTime: now,
      pausedAt: now,
    };
    savePersistence(updated);
    persistRef.current = updated;
    stopInterval();
    setTimerState(prev => ({ ...prev, status: 'paused' }));
  }, [stopInterval]);

  const resumeTimer = useCallback(() => {
    const p = persistRef.current;
    if (!p || !p.pausedAt) return;
    const updated: TimerPersistence = {
      ...p,
      startTime: Date.now(),
      pausedAt: undefined,
    };
    savePersistence(updated);
    persistRef.current = updated;
    setTimerState(prev => ({ ...prev, status: 'running' }));
    startInterval();
  }, [startInterval]);

  const stopTimer = useCallback(() => {
    stopInterval();
    // Keep persistence intact so the log prompt can show final time
    setTimerState(prev => ({ ...prev, status: 'completed' }));
  }, [stopInterval]);

  const clearTimer = useCallback(() => {
    stopInterval();
    savePersistence(null);
    persistRef.current = null;
    setTimerState({ status: 'idle', gameId: null, gameName: null, elapsedSeconds: 0 });
  }, [stopInterval]);

  return { timerState, startTimer, pauseTimer, resumeTimer, stopTimer, clearTimer };
}
