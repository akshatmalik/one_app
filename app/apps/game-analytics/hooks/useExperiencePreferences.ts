'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_EXPERIENCE_PREFERENCES,
  ExperiencePreferences,
  loadExperiencePreferences,
  saveExperiencePreferences,
} from '../lib/experience-preferences';

export function useExperiencePreferences(userId: string | null) {
  const storageUserId = userId || 'local-user';
  const [preferences, setPreferences] = useState<ExperiencePreferences>(() =>
    loadExperiencePreferences(storageUserId),
  );

  useEffect(() => {
    setPreferences(loadExperiencePreferences(storageUserId));
  }, [storageUserId]);

  const updatePreferences = useCallback((changes: Partial<ExperiencePreferences>) => {
    setPreferences(current => {
      const next = { ...current, ...changes, version: 1 } as ExperiencePreferences;
      saveExperiencePreferences(storageUserId, next);
      return next;
    });
  }, [storageUserId]);

  const resetPreferences = useCallback(() => {
    const next = { ...DEFAULT_EXPERIENCE_PREFERENCES };
    saveExperiencePreferences(storageUserId, next);
    setPreferences(next);
  }, [storageUserId]);

  return { preferences, updatePreferences, resetPreferences };
}

