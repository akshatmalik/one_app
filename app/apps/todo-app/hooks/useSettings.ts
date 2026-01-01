'use client';

import { useState, useEffect } from 'react';
import { settingsRepository } from '../lib/settings-storage';
import { AppSettings } from '../lib/types';

export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      settingsRepository.setUserId(userId || 'local-user');
      const data = await settingsRepository.get();
      setSettings(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setStartDate = async (startDate: string): Promise<AppSettings> => {
    try {
      settingsRepository.setUserId(userId || 'local-user');
      const updated = await settingsRepository.set(startDate);
      await refresh();
      return updated;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateSettings = async (updates: Partial<Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<AppSettings> => {
    try {
      settingsRepository.setUserId(userId || 'local-user');
      const updated = await settingsRepository.update(updates);
      await refresh();
      return updated;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    settings,
    loading,
    error,
    setStartDate,
    updateSettings,
    refresh,
  };
}
