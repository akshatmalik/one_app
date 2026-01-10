'use client';

import { useState, useEffect } from 'react';
import { MoodTrackerSettings } from '../lib/types';
import { settingsRepository } from '../lib/storage';
import { useAuthContext } from '@/lib/AuthContext';
import { settingsRepository as todoSettingsRepo } from '@/app/apps/todo-app/lib/settings-storage';

export function useAppSettings() {
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<MoodTrackerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set user ID on repository when user changes
  useEffect(() => {
    settingsRepository.setUserId(user?.uid || 'local-user');
    todoSettingsRepo.setUserId(user?.uid || 'local-user');
  }, [user]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get mood tracker settings first
      let data = await settingsRepository.get();

      // If no mood tracker settings exist, try to get from todo app settings
      if (!data) {
        const todoSettings = await todoSettingsRepo.get();
        if (todoSettings && todoSettings.startDate) {
          // Create mood tracker settings using todo app's start date
          data = await settingsRepository.set({
            userId: user?.uid || 'local-user',
            startDate: todoSettings.startDate,
          });
        }
      }

      setSettings(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const updateSettings = async (
    settingsData: Omit<MoodTrackerSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<MoodTrackerSettings> => {
    try {
      setError(null);
      const updated = await settingsRepository.set({
        ...settingsData,
        userId: user?.uid || 'local-user',
      });
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
    refresh,
    updateSettings,
  };
}
