'use client';

/**
 * Up Next "Suggested Next" preferences — the thumbs up/down signals that tune
 * which backlog games get recommended. Persisted in localStorage per user
 * (SSR-safe). Like the estimator settings, these are personal planning knobs
 * rather than core game data, so they stay device-local and don't go through the
 * Hybrid/Firebase repository (which would also require a deployed Firestore rule).
 */

import { Game } from './types';
import {
  RecommendationPreferences,
  getRecPriceBracket,
  getRecLengthBucket,
} from './calculations';

export type PreferenceState = 'like' | 'dislike' | 'none';

export const EMPTY_PREFERENCES: RecommendationPreferences = {
  liked: [],
  disliked: [],
  genreWeights: {},
  priceWeights: {},
  lengthWeights: {},
};

const keyFor = (userId: string) => `ga-queue-preferences-${userId || 'local-user'}`;

export function loadQueuePreferences(userId: string): RecommendationPreferences {
  if (typeof window === 'undefined') return clone(EMPTY_PREFERENCES);
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return clone(EMPTY_PREFERENCES);
    const parsed = JSON.parse(raw) as Partial<RecommendationPreferences>;
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      disliked: Array.isArray(parsed.disliked) ? parsed.disliked : [],
      genreWeights: parsed.genreWeights ?? {},
      priceWeights: parsed.priceWeights ?? {},
      lengthWeights: parsed.lengthWeights ?? {},
    };
  } catch {
    return clone(EMPTY_PREFERENCES);
  }
}

export function saveQueuePreferences(userId: string, prefs: RecommendationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getPreferenceState(prefs: RecommendationPreferences, gameId: string): PreferenceState {
  if (prefs.liked.includes(gameId)) return 'like';
  if (prefs.disliked.includes(gameId)) return 'dislike';
  return 'none';
}

const signalValue = (state: PreferenceState): number =>
  state === 'like' ? 1 : state === 'dislike' ? -1 : 0;

/**
 * Move a game to a target preference state, adjusting the per-dimension weights
 * by exactly the delta between the old and new state. This keeps the weight
 * tallies correct under any transition (like→dislike applies a -2 swing, etc.).
 */
export function setPreference(
  prefs: RecommendationPreferences,
  game: Game,
  target: PreferenceState
): RecommendationPreferences {
  const current = getPreferenceState(prefs, game.id);
  if (current === target) return prefs;

  const delta = signalValue(target) - signalValue(current);
  const next: RecommendationPreferences = {
    liked: prefs.liked.filter(id => id !== game.id),
    disliked: prefs.disliked.filter(id => id !== game.id),
    genreWeights: { ...prefs.genreWeights },
    priceWeights: { ...prefs.priceWeights },
    lengthWeights: { ...prefs.lengthWeights },
  };

  if (target === 'like') next.liked.push(game.id);
  if (target === 'dislike') next.disliked.push(game.id);

  if (game.genre) bump(next.genreWeights, game.genre, delta);
  bump(next.priceWeights, getRecPriceBracket(game.price), delta);
  bump(next.lengthWeights, getRecLengthBucket(game), delta);

  return next;
}

function bump(map: Record<string, number>, key: string, delta: number): void {
  const value = (map[key] || 0) + delta;
  if (value === 0) delete map[key];
  else map[key] = value;
}

function clone(prefs: RecommendationPreferences): RecommendationPreferences {
  return {
    liked: [...prefs.liked],
    disliked: [...prefs.disliked],
    genreWeights: { ...prefs.genreWeights },
    priceWeights: { ...prefs.priceWeights },
    lengthWeights: { ...prefs.lengthWeights },
  };
}
