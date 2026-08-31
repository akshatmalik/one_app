'use client';

import { PurchaseSource, SubscriptionTier } from './types';

export interface ExperiencePreferences {
  version: 1;
  ecosystem: 'PlayStation' | 'Multi-platform';
  defaultPlatform: string;
  defaultPurchaseSource: PurchaseSource;
  psPlusTier: SubscriptionTier;
  showTimers: boolean;
  showSessionDetails: boolean;
  defaultSharePrivacy: 'highlights' | 'hide-spending' | 'everything';
}

export const DEFAULT_EXPERIENCE_PREFERENCES: ExperiencePreferences = {
  version: 1,
  ecosystem: 'PlayStation',
  defaultPlatform: 'PS5',
  defaultPurchaseSource: 'PlayStation',
  psPlusTier: 'Extra',
  showTimers: false,
  showSessionDetails: false,
  defaultSharePrivacy: 'hide-spending',
};

const keyFor = (userId: string) => `ga-experience-preferences-${userId || 'local-user'}`;

export function loadExperiencePreferences(userId: string): ExperiencePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_EXPERIENCE_PREFERENCES };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...DEFAULT_EXPERIENCE_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<ExperiencePreferences>;
    return {
      ...DEFAULT_EXPERIENCE_PREFERENCES,
      ...parsed,
      version: 1,
    };
  } catch {
    return { ...DEFAULT_EXPERIENCE_PREFERENCES };
  }
}

export function saveExperiencePreferences(userId: string, preferences: ExperiencePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(preferences));
  } catch {
    // Device-local preferences are best effort. Core game data is unaffected.
  }
}

