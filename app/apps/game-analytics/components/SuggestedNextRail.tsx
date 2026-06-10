'use client';

import { useMemo } from 'react';
import { Sparkles, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getPlayNextRecommendations, RecommendationPreferences } from '../lib/calculations';
import { PreferenceState } from '../lib/queue-preferences';

interface SuggestedNextRailProps {
  /** Games not already in the queue (backlog + in-progress candidates live here). */
  availableGames: Game[];
  prefs: RecommendationPreferences;
  onAdd: (gameId: string) => void;
  onLike: (game: Game) => void;
  onDislike: (game: Game) => void;
  stateOf: (gameId: string) => PreferenceState;
}

/**
 * Curatable "Suggested Next" rail. Surfaces the recommendation engine (already
 * tuned by the user's thumbs up/down) as something you can act on: Add to queue,
 * or 👍/👎 to teach it what you like across genre, price, and length.
 */
export function SuggestedNextRail({
  availableGames, prefs, onAdd, onLike, onDislike, stateOf,
}: SuggestedNextRailProps) {
  const recommendations = useMemo(
    () => getPlayNextRecommendations(availableGames, 6, prefs),
    [availableGames, prefs]
  );

  if (recommendations.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/[0.07] via-white/[0.02] to-transparent border border-purple-500/10">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-white/80">Suggested next</h3>
        <span className="text-[10px] text-white/30">— 👍 / 👎 to tune what you see</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mb-1">
        {recommendations.map(({ game, reasons }) => {
          const state = stateOf(game.id);
          const g = game as GameWithMetrics;
          return (
            <div
              key={game.id}
              className="shrink-0 w-44 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col"
            >
              {game.thumbnail ? (
                <img src={game.thumbnail} alt={game.name} className="w-full h-20 object-cover rounded-lg mb-2" loading="lazy" />
              ) : (
                <div className="w-full h-20 rounded-lg mb-2 bg-gradient-to-br from-purple-500/15 to-white/[0.02] flex items-center justify-center">
                  <Sparkles size={18} className="text-white/15" />
                </div>
              )}

              <p className="text-xs font-medium text-white/90 truncate">{game.name}</p>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {game.genre && <span className="text-[9px] px-1 py-0.5 bg-white/5 rounded text-white/40">{game.genre}</span>}
                {typeof g.totalHours === 'number' && g.totalHours > 0 && (
                  <span className="text-[9px] text-white/30">{Math.round(g.totalHours)}h in</span>
                )}
              </div>
              {reasons[0] && (
                <p className="text-[10px] text-white/40 mt-1 leading-snug line-clamp-2 min-h-[1.8em]">{reasons[0]}</p>
              )}

              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => onAdd(game.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-600/25 text-purple-200 hover:bg-purple-600/40 text-[11px] font-medium transition-all"
                >
                  <Plus size={12} /> Add
                </button>
                <button
                  onClick={() => onLike(game)}
                  aria-label="I like this suggestion"
                  className={clsx(
                    'p-1.5 rounded-lg transition-all',
                    state === 'like'
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'bg-white/5 text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10'
                  )}
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  onClick={() => onDislike(game)}
                  aria-label="Not interested"
                  className={clsx(
                    'p-1.5 rounded-lg transition-all',
                    state === 'dislike'
                      ? 'bg-red-500/25 text-red-300'
                      : 'bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-500/10'
                  )}
                >
                  <ThumbsDown size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
