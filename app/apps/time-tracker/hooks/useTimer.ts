'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActiveTimer } from '../lib/types';
import { calculateDurationFromISO, getTodayDate } from '../lib/utils';
import { useTimeEntries } from './useTimeEntries';

const TIMER_STORAGE_KEY = 'time-tracker-active-timer';

export function useTimer() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const { addEntry } = useTimeEntries();

  // Load timer from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const timer = JSON.parse(saved) as ActiveTimer;
        setActiveTimer(timer);
      }
    }
  }, []);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (!activeTimer) {
      setElapsedMinutes(0);
      return;
    }

    const updateElapsed = () => {
      const elapsed = calculateDurationFromISO(activeTimer.startTime, new Date().toISOString());
      setElapsedMinutes(elapsed);
    };

    // Update immediately
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Save timer to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeTimer) {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
      } else {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }
  }, [activeTimer]);

  const startTimer = useCallback((activityName: string, categoryId?: string) => {
    const timer: ActiveTimer = {
      activityName,
      categoryId,
      startTime: new Date().toISOString(),
    };
    setActiveTimer(timer);
  }, []);

  const stopTimer = useCallback(async (notes?: string) => {
    if (!activeTimer) return null;

    const endTime = new Date().toISOString();
    const duration = calculateDurationFromISO(activeTimer.startTime, endTime);

    // Create time entry
    const entry = await addEntry({
      date: getTodayDate(),
      activityName: activeTimer.activityName,
      categoryId: activeTimer.categoryId,
      startTime: activeTimer.startTime,
      endTime,
      duration,
      notes,
    });

    // Clear timer
    setActiveTimer(null);
    setElapsedMinutes(0);

    return entry;
  }, [activeTimer, addEntry]);

  const cancelTimer = useCallback(() => {
    setActiveTimer(null);
    setElapsedMinutes(0);
  }, []);

  return {
    activeTimer,
    elapsedMinutes,
    isRunning: !!activeTimer,
    startTimer,
    stopTimer,
    cancelTimer,
  };
}
