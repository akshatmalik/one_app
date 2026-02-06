'use client';

import { useMemo, useState } from 'react';
import {
  Compass, Lightbulb, GitBranch, Gamepad2, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Play, Sparkles,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  whatIfCompletedBacklog,
  getPersonalityEvolution,
  getFranchiseAnalytics,
  getPlayNextRecommendations,
  getGamingPersonality,
  getTotalHours,
} from '../lib/calculations';
import clsx from 'clsx';

interface DiscoverPanelProps {
  games: Game[];
}

export function DiscoverPanel({ games }: DiscoverPanelProps) {
  const recommendations = useMemo(() => getPlayNextRecommendations(games, 5), [games]);
  const evolution = useMemo(() => getPersonalityEvolution(games), [games]);
  const franchises = useMemo(() => getFranchiseAnalytics(games), [games]);
  const backlogSim = useMemo(() => whatIfCompletedBacklog(games), [games]);
  const personality = useMemo(() => getGamingPersonality(games), [games]);

  const [showAllFranchises, setShowAllFranchises] = useState(false);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Compass size={14} className="text-emerald-400" />
        Discover & Recommend
      </h3>

      {/* Play Next Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Play size={14} className="text-emerald-400" />
            Play Next
          </h4>

          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={rec.game.id}
                className="flex items-center gap-3 p-2 bg-white/[0.03] rounded-lg"
              >
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  i === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                  i === 1 ? 'bg-blue-500/20 text-blue-400' :
                  'bg-white/5 text-white/30'
                )}>
                  {i + 1}
                </div>

                {rec.game.thumbnail ? (
                  <img
                    src={rec.game.thumbnail}
                    alt={rec.game.name}
                    className="w-8 h-8 object-cover rounded shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-8 h-8 bg-white/5 rounded shrink-0 flex items-center justify-center">
                    <Gamepad2 size={12} className="text-white/20" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate">{rec.game.name}</div>
                  <div className="text-[10px] text-white/30 truncate">{rec.reasons[0]}</div>
                </div>

                <div className={clsx(
                  'text-xs font-bold shrink-0',
                  rec.score >= 70 ? 'text-emerald-400' :
                  rec.score >= 50 ? 'text-yellow-400' : 'text-white/30'
                )}>
                  {rec.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What-If Simulator */}
      {backlogSim.difference.value > 0 && (
        <div className="p-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Lightbulb size={14} className="text-violet-400" />
            What If?
          </h4>

          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/50 mb-2">{backlogSim.scenario}</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-sm font-medium text-white/60">{backlogSim.before.label}</div>
                <div className="text-[10px] text-white/30">now</div>
              </div>
              <div className="text-white/20">→</div>
              <div className="text-center">
                <div className="text-sm font-bold text-emerald-400">{backlogSim.after.label}</div>
                <div className="text-[10px] text-white/30">if completed</div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs text-emerald-400">{backlogSim.difference.label}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personality Evolution */}
      {evolution.length >= 2 && (
        <div className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-pink-400" />
            Personality Evolution
          </h4>

          <div className="text-center mb-3">
            <div className="text-lg font-bold text-pink-400">{personality.type}</div>
            <div className="text-xs text-white/40">Current personality</div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-2">
              {evolution.slice(-6).map((snap, i, arr) => {
                const isLatest = i === arr.length - 1;
                const changed = i > 0 && snap.personality !== arr[i - 1].personality;
                return (
                  <div key={snap.period} className="flex items-center gap-3 pl-1">
                    <div className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 shrink-0',
                      isLatest
                        ? 'bg-pink-500/30 border-pink-500'
                        : changed
                          ? 'bg-yellow-500/20 border-yellow-500/50'
                          : 'bg-white/5 border-white/20'
                    )}>
                      {changed && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
                      {isLatest && <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className={clsx(
                          'text-xs font-medium',
                          isLatest ? 'text-pink-400' : changed ? 'text-yellow-400' : 'text-white/40'
                        )}>
                          {snap.personality}
                        </span>
                        {changed && <span className="text-[9px] text-yellow-400/60 ml-1">shifted</span>}
                      </div>
                      <span className="text-[10px] text-white/30">{snap.periodLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {evolution.length >= 3 && (() => {
            const first = evolution[0].personality;
            const last = evolution[evolution.length - 1].personality;
            const shifts = evolution.filter((e, i) => i > 0 && e.personality !== evolution[i - 1].personality).length;
            return (
              <div className="mt-3 pt-3 border-t border-white/5 text-center text-xs text-white/40">
                {first === last
                  ? `Consistently a ${first} over ${evolution.length} periods`
                  : `Evolved from ${first} to ${last} with ${shifts} shift${shifts !== 1 ? 's' : ''}`}
              </div>
            );
          })()}
        </div>
      )}

      {/* Franchise Deep Dive */}
      {franchises.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <GitBranch size={14} className="text-orange-400" />
            Franchise Analytics
          </h4>

          <div className="space-y-3">
            {franchises.slice(0, showAllFranchises ? undefined : 3).map(f => (
              <div key={f.franchise} className="p-3 bg-white/[0.03] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-white/80">{f.franchise}</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {f.ratingTrend === 'improving' && <TrendingUp size={10} className="text-emerald-400" />}
                    {f.ratingTrend === 'declining' && <TrendingDown size={10} className="text-red-400" />}
                    {f.ratingTrend === 'stable' && <Minus size={10} className="text-white/30" />}
                    <span className={clsx(
                      f.ratingTrend === 'improving' ? 'text-emerald-400' :
                      f.ratingTrend === 'declining' ? 'text-red-400' : 'text-white/30'
                    )}>
                      {f.ratingTrend !== 'single' ? f.ratingTrend : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-xs font-medium text-white/70">{f.gamesCount}</div>
                    <div className="text-[9px] text-white/30">games</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-400">{f.totalHours}h</div>
                    <div className="text-[9px] text-white/30">hours</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-yellow-400">{f.avgRating}</div>
                    <div className="text-[9px] text-white/30">avg rating</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-400">${f.totalSpent}</div>
                    <div className="text-[9px] text-white/30">invested</div>
                  </div>
                </div>

                {/* Individual games */}
                <div className="mt-2 space-y-1">
                  {f.games.map(g => (
                    <div key={g.name} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/40 truncate flex-1">{g.name}</span>
                      <span className="text-white/30 ml-2">{g.hours}h</span>
                      {g.rating > 0 && <span className="text-yellow-400/60 ml-2">{g.rating}/10</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {franchises.length > 3 && (
            <button
              onClick={() => setShowAllFranchises(!showAllFranchises)}
              className="w-full mt-2 text-xs text-white/30 hover:text-white/50 flex items-center justify-center gap-1 transition-colors"
            >
              {showAllFranchises ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAllFranchises ? 'Show less' : `+${franchises.length - 3} more franchises`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
