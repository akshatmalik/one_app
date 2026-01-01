'use client';

import { useState, useEffect, useCallback } from 'react';
import { repository } from '../lib/storage';
import { TaskStats, DailyCompletion } from '../lib/types';
import { calculateStats, getDailyCompletionData, getDateRange } from '../lib/calculations';

export function useStats(userId: string | null) {
  const [weeklyStats, setWeeklyStats] = useState<TaskStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<TaskStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyCompletion[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailyCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Set userId on repository
      repository.setUserId(userId || 'local-user');

      // Get date ranges
      const weekRange = getDateRange('week');
      const monthRange = getDateRange('month');

      // Fetch tasks for both periods
      const [weekCompleted, monthCompleted, allTasks, allCompleted] = await Promise.all([
        repository.getCompletedInRange(weekRange.startDate, weekRange.endDate),
        repository.getCompletedInRange(monthRange.startDate, monthRange.endDate),
        repository.getAll(),
        repository.getAllCompleted(),
      ]);

      // Get tasks for each period (including incomplete)
      const weekStart = weekRange.startDate.split('T')[0];
      const monthStart = monthRange.startDate.split('T')[0];

      const weekTasks = allTasks.filter(task => task.date >= weekStart);
      const monthTasks = allTasks.filter(task => task.date >= monthStart);

      // Calculate stats
      const weekStats = calculateStats(weekTasks, weekCompleted);
      const monthStats = calculateStats(monthTasks, monthCompleted);

      // Calculate daily data for charts
      const weekDaily = getDailyCompletionData(allCompleted, 7);
      const monthDaily = getDailyCompletionData(allCompleted, 30);

      setWeeklyStats(weekStats);
      setMonthlyStats(monthStats);
      setWeeklyData(weekDaily);
      setMonthlyData(monthDaily);
    } catch (e) {
      setError(e as Error);
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    weeklyStats,
    monthlyStats,
    weeklyData,
    monthlyData,
    loading,
    error,
    refresh: loadStats,
  };
}
