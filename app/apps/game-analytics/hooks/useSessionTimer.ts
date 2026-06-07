'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'ga-session-timer';

export interface ActiveTimer {
  gameId: string;
  gameName: string;
  thumbnail?: string;
  startTime: number;       // Unix ms of last start/resume
  totalElapsedMs: number;  // Accumulated ms before last start (for pause/resume)
  paused: boolean;
}

function loadTimer(): ActiveTimer | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveTimer) : null;
  } catch { return null; }
}

function saveTimer(timer: ActiveTimer | null) {
  if (typeof window === 'undefined') return;
  try {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function useSessionTimer() {
  const [timer, setTimer] = useState<ActiveTimer | null>(() => loadTimer());
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second when running
  useEffect(() => {
    if (timer && !timer.paused) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer?.paused, timer?.gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsedMs = timer
    ? timer.paused
      ? timer.totalElapsedMs
      : timer.totalElapsedMs + Math.max(0, now - timer.startTime)
    : 0;

  const startTimer = useCallback((game: { id: string; name: string; thumbnail?: string }) => {
    const next: ActiveTimer = {
      gameId: game.id,
      gameName: game.name,
      thumbnail: game.thumbnail,
      startTime: Date.now(),
      totalElapsedMs: 0,
      paused: false,
    };
    setTimer(next);
    saveTimer(next);
    setNow(Date.now());
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer(prev => {
      if (!prev || prev.paused) return prev;
      const next: ActiveTimer = {
        ...prev,
        totalElapsedMs: prev.totalElapsedMs + Math.max(0, Date.now() - prev.startTime),
        paused: true,
      };
      saveTimer(next);
      return next;
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer(prev => {
      if (!prev || !prev.paused) return prev;
      const next: ActiveTimer = { ...prev, startTime: Date.now(), paused: false };
      saveTimer(next);
      return next;
    });
    setNow(Date.now());
  }, []);

  // Returns elapsed hours for pre-filling the play log, then clears timer.
  const stopTimer = useCallback((): { hours: number; gameId: string; gameName: string; thumbnail?: string } | null => {
    setTimer(prev => {
      if (!prev) return null;
      saveTimer(null);
      return null;
    });
    // Use the latest timer snapshot from the closure
    return null; // caller reads from the hook's current values before calling
  }, []);

  // Separate function that returns the current snapshot (call before stopTimer)
  const snapshotAndStop = useCallback((): { hours: number; gameId: string; gameName: string; thumbnail?: string } | null => {
    const current = loadTimer(); // read latest from storage to handle edge cases
    if (!current) return null;
    const totalMs = current.paused
      ? current.totalElapsedMs
      : current.totalElapsedMs + Math.max(0, Date.now() - current.startTime);
    saveTimer(null);
    setTimer(null);
    return {
      hours: Math.round((totalMs / 3_600_000) * 100) / 100,
      gameId: current.gameId,
      gameName: current.gameName,
      thumbnail: current.thumbnail,
    };
  }, []);

  const discardTimer = useCallback(() => {
    saveTimer(null);
    setTimer(null);
  }, []);

  return {
    activeTimer: timer,
    elapsedMs,
    elapsedHours: elapsedMs / 3_600_000,
    formattedTime: formatElapsed(elapsedMs),
    isRunning: !!(timer && !timer.paused),
    startTimer,
    pauseTimer,
    resumeTimer,
    snapshotAndStop,
    discardTimer,
  };
}
