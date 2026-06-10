'use client';

import { useState, useCallback } from 'react';
import { Game } from '../lib/types';
import { RecommendationPreferences } from '../lib/calculations';
import {
  loadQueuePreferences,
  saveQueuePreferences,
  setPreference,
  getPreferenceState,
  PreferenceState,
} from '../lib/queue-preferences';

/**
 * Manages the user's thumbs up/down tuning for Up Next suggestions.
 * Toggling a thumb that's already set returns the game to neutral.
 */
export function useQueuePreferences(userId: string | null) {
  const uid = userId || 'local-user';
  const [prefs, setPrefs] = useState<RecommendationPreferences>(() => loadQueuePreferences(uid));

  const apply = useCallback((game: Game, target: PreferenceState) => {
    setPrefs(prev => {
      const next = setPreference(prev, game, target);
      if (next !== prev) saveQueuePreferences(uid, next);
      return next;
    });
  }, [uid]);

  const like = useCallback((game: Game) => {
    apply(game, getPreferenceState(prefs, game.id) === 'like' ? 'none' : 'like');
  }, [apply, prefs]);

  const dislike = useCallback((game: Game) => {
    apply(game, getPreferenceState(prefs, game.id) === 'dislike' ? 'none' : 'dislike');
  }, [apply, prefs]);

  const stateOf = useCallback(
    (gameId: string): PreferenceState => getPreferenceState(prefs, gameId),
    [prefs]
  );

  return { prefs, like, dislike, stateOf };
}
