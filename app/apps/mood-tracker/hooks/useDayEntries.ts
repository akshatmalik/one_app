'use client';

import { useState, useEffect } from 'react';
import { DayEntry } from '../lib/types';
import { dayEntryRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useDayEntries() {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set user ID on repository when user changes
  useEffect(() => {
    dayEntryRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dayEntryRepository.getAll();
      setEntries(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const getByDayNumber = async (dayNumber: number): Promise<DayEntry | null> => {
    try {
      setError(null);
      return await dayEntryRepository.getByDayNumber(dayNumber);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const getByDateRange = async (startDate: string, endDate: string): Promise<DayEntry[]> => {
    try {
      setError(null);
      return await dayEntryRepository.getByDateRange(startDate, endDate);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const createEntry = async (
    entryData: Omit<DayEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<DayEntry> => {
    try {
      setError(null);
      const entry = await dayEntryRepository.create({
        ...entryData,
        userId: user?.uid || 'local-user',
      });
      await refresh();
      return entry;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateEntry = async (id: string, updates: Partial<DayEntry>): Promise<DayEntry> => {
    try {
      setError(null);
      const entry = await dayEntryRepository.update(id, updates);
      await refresh();
      return entry;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteEntry = async (id: string): Promise<void> => {
    try {
      setError(null);
      await dayEntryRepository.delete(id);
      await refresh();
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
    getByDayNumber,
    getByDateRange,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
