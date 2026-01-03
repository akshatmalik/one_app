'use client';

import { useState, useEffect } from 'react';
import { TimeEntry } from '../lib/types';
import { timeEntryRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';
import { getTodayDate } from '../lib/utils';

export function useTimeEntries(dateFilter?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();

  // Set userId when user changes
  useEffect(() => {
    timeEntryRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      let data: TimeEntry[];

      if (dateFilter) {
        data = await timeEntryRepository.getByDate(dateFilter);
      } else {
        data = await timeEntryRepository.getAll();
      }

      setEntries(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user, dateFilter]);

  const addEntry = async (data: Omit<TimeEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const entry = await timeEntryRepository.create({ ...data, userId: user?.uid || 'local-user' });
      await refresh();
      return entry;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateEntry = async (id: string, updates: Partial<TimeEntry>) => {
    try {
      const entry = await timeEntryRepository.update(id, updates);
      await refresh();
      return entry;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await timeEntryRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getEntriesForDate = async (date: string): Promise<TimeEntry[]> => {
    try {
      return await timeEntryRepository.getByDate(date);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getEntriesForDateRange = async (startDate: string, endDate: string): Promise<TimeEntry[]> => {
    try {
      return await timeEntryRepository.getByDateRange(startDate, endDate);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    entries,
    loading,
    error,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntriesForDate,
    getEntriesForDateRange,
  };
}
