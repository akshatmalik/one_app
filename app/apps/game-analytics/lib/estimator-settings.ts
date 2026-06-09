'use client';

/**
 * Timeline Estimator settings — weekly playtime + pace scenarios.
 * Stored in localStorage (per user), SSR-safe. These are planning knobs, not
 * core game data, so they don't need the Hybrid/Firebase repository treatment.
 */

export interface EstimatorSettings {
  weeklyHours: number;   // the pace used for the main timeline
  lowPace: number;       // "Low pace" scenario
  highPace: number;      // "High pace" scenario
}

export const DEFAULT_ESTIMATOR_SETTINGS: EstimatorSettings = {
  weeklyHours: 8.5,
  lowPace: 7,
  highPace: 10,
};

const keyFor = (userId: string) => `ga-estimator-settings-${userId || 'local-user'}`;

export function loadEstimatorSettings(userId: string, paceHint?: number): EstimatorSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_ESTIMATOR_SETTINGS };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EstimatorSettings>;
      return {
        weeklyHours: numOr(parsed.weeklyHours, DEFAULT_ESTIMATOR_SETTINGS.weeklyHours),
        lowPace: numOr(parsed.lowPace, DEFAULT_ESTIMATOR_SETTINGS.lowPace),
        highPace: numOr(parsed.highPace, DEFAULT_ESTIMATOR_SETTINGS.highPace),
      };
    }
  } catch {
    /* fall through to defaults */
  }
  // No saved settings — seed the main pace from the user's actual recent pace if we have one.
  if (paceHint && paceHint > 0) {
    const mid = Math.round(paceHint * 10) / 10;
    return { weeklyHours: mid, lowPace: Math.max(1, Math.round(mid * 0.7)), highPace: Math.round(mid * 1.25) };
  }
  return { ...DEFAULT_ESTIMATOR_SETTINGS };
}

export function saveEstimatorSettings(userId: string, settings: EstimatorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(settings));
  } catch {
    /* ignore quota / disabled storage */
  }
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : fallback;
}
