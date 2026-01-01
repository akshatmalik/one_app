'use client';

import { Sparkles, Gem, Frown, Package, Flame, Trophy, Target, TrendingUp, Zap } from 'lucide-react';
import { Game } from '../lib/types';
import {
  findHiddenGems,
  findRegretPurchases,
  findShelfWarmers,
  getCurrentGamingStreak,
  getCompletionVelocity,
  getPlatformPreference,
  getGamingVelocity,
  getBestGamingMonth,
} from '../lib/calculations';
import clsx from 'clsx';

interface FunStatsPanelProps {
  games: Game[];
}

export function FunStatsPanel({ games }: FunStatsPanelProps) {
  const hiddenGems = findHiddenGems(games);
  const regretPurchases = findRegretPurchases(games);
  const shelfWarmers = findShelfWarmers(games);
  const gamingStreak = getCurrentGamingStreak(games);
  const completionVelocity = getCompletionVelocity(games);
  const platformPreference = getPlatformPreference(games);
  const weeklyVelocity = getGamingVelocity(games, 7);
  const monthlyVelocity = getGamingVelocity(games, 30);
  const bestMonth = getBestGamingMonth(games);

  return (
    <div className="space-y-4">
      {/* Gaming Insights Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-purple-400" />
        <h3 className="text-base font-semibold text-white">Gaming Insights</h3>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Gaming Streak */}
        {gamingStreak > 0 && (
          <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs text-white/40">Current Streak</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{gamingStreak}</div>
            <div className="text-xs text-white/30">day{gamingStreak !== 1 ? 's' : ''}</div>
          </div>
        )}

        {/* Weekly Velocity */}
        {weeklyVelocity > 0 && (
          <div className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-blue-400" />
              <span className="text-xs text-white/40">Weekly Pace</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{weeklyVelocity.toFixed(1)}h</div>
            <div className="text-xs text-white/30">per day</div>
          </div>
        )}

        {/* Completion Velocity */}
        {completionVelocity && (
          <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-emerald-400" />
              <span className="text-xs text-white/40">Avg Completion</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{completionVelocity.toFixed(0)}</div>
            <div className="text-xs text-white/30">days</div>
          </div>
        )}

        {/* Best Gaming Month */}
        {bestMonth && (
          <div className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-purple-400" />
              <span className="text-xs text-white/40">Best Month</span>
            </div>
            <div className="text-lg font-bold text-purple-400">
              {new Date(bestMonth.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </div>
            <div className="text-xs text-white/30">{bestMonth.hours.toFixed(0)}h played</div>
          </div>
        )}
      </div>

      {/* Hidden Gems */}
      {hiddenGems.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Gem size={16} className="text-emerald-400" />
            <h4 className="text-sm font-medium text-white">Hidden Gems</h4>
            <span className="text-xs text-white/30">Amazing value finds</span>
          </div>
          <div className="space-y-2">
            {hiddenGems.slice(0, 3).map((gem, idx) => (
              <div key={gem.game.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{gem.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${gem.game.price} • {gem.game.hours}h • {gem.game.rating}/10
                  </div>
                </div>
                <div className="text-xs text-emerald-400 font-medium">
                  ${(gem.game.price / gem.game.hours).toFixed(2)}/h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shelf Warmers */}
      {shelfWarmers.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-yellow-400" />
            <h4 className="text-sm font-medium text-white">Shelf Warmers</h4>
            <span className="text-xs text-white/30">Collecting dust</span>
          </div>
          <div className="space-y-2">
            {shelfWarmers.slice(0, 3).map((warmer) => (
              <div key={warmer.game.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{warmer.game.name}</div>
                  <div className="text-xs text-white/40">${warmer.game.price}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-yellow-400">{Math.floor(warmer.daysSitting)}</div>
                  <div className="text-xs text-white/30">days</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-400/70 mt-3 italic">Maybe it&apos;s time to give these a try?</p>
        </div>
      )}

      {/* Regret Purchases */}
      {regretPurchases.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Frown size={16} className="text-red-400" />
            <h4 className="text-sm font-medium text-white">Buyer&apos;s Remorse</h4>
            <span className="text-xs text-white/30">Could use more love</span>
          </div>
          <div className="space-y-2">
            {regretPurchases.slice(0, 3).map((regret) => (
              <div key={regret.game.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{regret.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${regret.game.price} • {regret.game.hours}h played
                  </div>
                </div>
                <div className="text-xs text-red-400">
                  Regret: {regret.regretScore.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-400/70 mt-3 italic">Give them another chance or accept the loss</p>
        </div>
      )}

      {/* Platform Preference */}
      {platformPreference.length > 1 && (
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-blue-400" />
            <h4 className="text-sm font-medium text-white">Platform Preference</h4>
            <span className="text-xs text-white/30">By playtime</span>
          </div>
          <div className="space-y-2">
            {platformPreference.slice(0, 3).map((platform, idx) => (
              <div key={platform.platform} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{platform.platform}</span>
                  <span className="text-white/50">{platform.hours.toFixed(0)}h ({platform.score.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full',
                      idx === 0 && 'bg-blue-500',
                      idx === 1 && 'bg-purple-500',
                      idx === 2 && 'bg-cyan-500'
                    )}
                    style={{ width: `${platform.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
