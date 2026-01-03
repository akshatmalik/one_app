'use client';

import { useState, useEffect } from 'react';
import { SchedulePreset, DayOfWeek } from '../lib/types';
import { schedulePresetRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useSchedules() {
  const [schedules, setSchedules] = useState<SchedulePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();

  // Set userId when user changes
  useEffect(() => {
    schedulePresetRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await schedulePresetRepository.getAll();
      setSchedules(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const addSchedule = async (data: Omit<SchedulePreset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const schedule = await schedulePresetRepository.create({ ...data, userId: user?.uid || 'local-user' });
      await refresh();
      return schedule;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<SchedulePreset>) => {
    try {
      const schedule = await schedulePresetRepository.update(id, updates);
      await refresh();
      return schedule;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await schedulePresetRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getScheduleById = (id: string): SchedulePreset | undefined => {
    return schedules.find(s => s.id === id);
  };

  const getSchedulesForDay = async (day: DayOfWeek): Promise<SchedulePreset[]> => {
    try {
      return await schedulePresetRepository.getByDayOfWeek(day);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    schedules,
    loading,
    error,
    refresh,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getScheduleById,
    getSchedulesForDay,
  };
}
