'use client';

import { useState, useEffect } from 'react';
import { AppSettings } from '../lib/types';
import { settingsRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthContext();

  // Set userId when user changes
  useEffect(() => {
    settingsRepository.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
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
  }, [user]);

  const createSettings = async (data: Omit<AppSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSettings = await settingsRepository.create({ ...data, userId: user?.uid || 'local-user' });
      await refresh();
      return newSettings;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const updateSettings = async (id: string, updates: Partial<AppSettings>) => {
    try {
      const updated = await settingsRepository.update(id, updates);
      await refresh();
      return updated;
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  const deleteSettings = async (id: string) => {
    try {
      await settingsRepository.delete(id);
      await refresh();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  };

  return {
    settings,
    loading,
    error,
    refresh,
    createSettings,
    updateSettings,
    deleteSettings,
  };
}
