'use client';

import { useState } from 'react';
import {
  Sparkles, Gem, Frown, Package, Flame, Trophy, Target, TrendingUp, Zap,
  Award, Clock, Heart, Percent, Calendar, Star, Shield, Rocket, Crown,
  DollarSign, Gamepad2, CheckCircle2
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  findHiddenGems,
  findRegretPurchases,
  findShelfWarmers,
  getCurrentGamingStreak,
  getLongestGamingStreak,
  getCompletionVelocity,
  getPlatformPreference,
  getGamingVelocity,
  getBestGamingMonth,
  getImpulseBuyerStat,
  getBacklogInDays,
  getGenreDiversity,
  getCommitmentScore,
  getFastestCompletion,
  getSlowestCompletion,
  getLongestSession,
  getCenturyClubGames,
  getQuickFixGames,
  getPatientGamerStats,
  getCompletionistRate,
  getHiddenGems,
  getMostInvestedFranchise,
  getValueChampion,
  getAverageDiscount,
  getTotalHours,
} from '../lib/calculations';
import { GameListModal } from './GameListModal';
import clsx from 'clsx';

interface FunStatsPanelProps {
  games: Game[];
}

type ModalType = 'centuryClub' | 'patientGamer' | 'freeGames' | 'quickFix' | 'shelfWarmers' | 'hiddenGems' | null;

export function FunStatsPanel({ games }: FunStatsPanelProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showAllRegrets, setShowAllRegrets] = useState(false);
  // Existing stats
  const hiddenGems = findHiddenGems(games);
  const regretPurchases = findRegretPurchases(games);
  const shelfWarmers = findShelfWarmers(games);
  const gamingStreak = getCurrentGamingStreak(games);
  const longestStreak = getLongestGamingStreak(games);
  const completionVelocity = getCompletionVelocity(games);
  const platformPreference = getPlatformPreference(games);
  const weeklyVelocity = getGamingVelocity(games, 7);
  const monthlyVelocity = getGamingVelocity(games, 30);
  const bestMonth = getBestGamingMonth(games);

  // New creative stats
  const impulseBuyer = getImpulseBuyerStat(games);
  const backlogDays = getBacklogInDays(games);
  const genreDiversity = getGenreDiversity(games);
  const commitmentScore = getCommitmentScore(games);
  const fastestCompletion = getFastestCompletion(games);
  const slowestCompletion = getSlowestCompletion(games);
  const longestSession = getLongestSession(games);
  const centuryClub = getCenturyClubGames(games);
  const quickFix = getQuickFixGames(games);
  const patientGamer = getPatientGamerStats(games);
  const completionist = getCompletionistRate(games);
  const hiddenGemsResult = getHiddenGems(games);
  const mostInvestedFranchise = getMostInvestedFranchise(games);
  const valueChampion = getValueChampion(games);
  const avgDiscount = getAverageDiscount(games);

  // Calculate some fun badges
  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const freeGames = ownedGames.filter(g => g.acquiredFree);
  const totalFreeValue = freeGames.reduce((sum, g) => sum + (g.originalPrice || 0), 0);

  return (
    <div className="space-y-4">
      {/* Gaming Insights Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-purple-400" />
        <h3 className="text-base font-semibold text-white">Gaming Insights</h3>
      </div>

      {/* Achievement Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Century Club */}
        {centuryClub.length > 0 && (
          <button
            onClick={() => setActiveModal('centuryClub')}
            className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown size={14} className="text-purple-400" />
              <span className="text-xs text-white/40">Century Club</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{centuryClub.length}</div>
            <div className="text-xs text-white/30">100+ hrs • Click to view</div>
          </button>
        )}

        {/* Patient Gamer */}
        {patientGamer.count > 0 && (
          <button
            onClick={() => setActiveModal('patientGamer')}
            className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-2 mb-1">
              <Percent size={14} className="text-blue-400" />
              <span className="text-xs text-white/40">Patient Gamer</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{patientGamer.count}</div>
            <div className="text-xs text-white/30">30%+ off • Click to view</div>
          </button>
        )}

        {/* Free Rider */}
        {freeGames.length > 0 && (
          <button
            onClick={() => setActiveModal('freeGames')}
            className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-2 mb-1">
              <Star size={14} className="text-emerald-400" />
              <span className="text-xs text-white/40">Free Rider</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">${totalFreeValue.toFixed(0)}</div>
            <div className="text-xs text-white/30">{freeGames.length} free • Click to view</div>
          </button>
        )}

        {/* Quick Fix */}
        {quickFix.length > 0 && (
          <button
            onClick={() => setActiveModal('quickFix')}
            className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs text-white/40">Quick Fix</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{quickFix.length}</div>
            <div className="text-xs text-white/30">&lt;10h • Click to view</div>
          </button>
        )}

        {/* All-Rounder */}
        {genreDiversity.uniqueGenres >= 5 && (
          <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 size={14} className="text-cyan-400" />
              <span className="text-xs text-white/40">All-Rounder</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">{genreDiversity.uniqueGenres}</div>
            <div className="text-xs text-white/30">genres played</div>
          </div>
        )}

        {/* Completionist */}
        {completionist.completionRate >= 50 && (
          <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-xs text-white/40">Completionist</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{completionist.completionRate.toFixed(0)}%</div>
            <div className="text-xs text-white/30">completion rate</div>
          </div>
        )}
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Gaming Streak */}
        {longestStreak > 0 && (
          <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs text-white/40">Longest Streak</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">{longestStreak}</div>
            <div className="text-xs text-white/30">day{longestStreak !== 1 ? 's' : ''} in a row</div>
          </div>
        )}

        {/* Commitment Score */}
        <div className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Heart size={14} className="text-purple-400" />
            <span className="text-xs text-white/40">Commitment</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{commitmentScore.toFixed(0)}%</div>
          <div className="text-xs text-white/30">games &gt;10hrs</div>
        </div>

        {/* Genre Diversity */}
        <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-cyan-400" />
            <span className="text-xs text-white/40">Genre Diversity</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{genreDiversity.percentage.toFixed(0)}%</div>
          <div className="text-xs text-white/30">{genreDiversity.uniqueGenres} genres</div>
        </div>

        {/* Backlog Boss */}
        {backlogDays > 0 && (
          <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Package size={14} className="text-yellow-400" />
              <span className="text-xs text-white/40">Backlog Boss</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{backlogDays.toFixed(0)}</div>
            <div className="text-xs text-white/30">days of backlog</div>
          </div>
        )}
      </div>

      {/* Hidden Gems */}
      {hiddenGems.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => setActiveModal('hiddenGems')}>
          <div className="flex items-center gap-2 mb-3">
            <Gem size={16} className="text-emerald-400" />
            <h4 className="text-sm font-medium text-white">Hidden Gems</h4>
            <span className="text-xs text-white/30">Amazing value finds • Click to view all</span>
          </div>
          <div className="space-y-2">
            {hiddenGems.slice(0, 3).map((gem, idx) => (
              <div key={gem.game.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                {gem.game.thumbnail && (
                  <img
                    src={gem.game.thumbnail}
                    alt={gem.game.name}
                    className="w-10 h-10 object-cover rounded shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{gem.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${gem.game.price} • {gem.game.hours}h • {gem.game.rating}/10
                  </div>
                </div>
                <div className="text-xs text-emerald-400 font-medium shrink-0">
                  ${(gem.game.price / gem.game.hours).toFixed(2)}/h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shelf Warmers */}
      {shelfWarmers.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all cursor-pointer" onClick={() => setActiveModal('shelfWarmers')}>
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-yellow-400" />
            <h4 className="text-sm font-medium text-white">Shelf Warmers</h4>
            <span className="text-xs text-white/30">Collecting dust • Click to view all</span>
          </div>
          <div className="space-y-2">
            {shelfWarmers.slice(0, 3).map((warmer) => (
              <div key={warmer.game.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                {warmer.game.thumbnail && (
                  <img
                    src={warmer.game.thumbnail}
                    alt={warmer.game.name}
                    className="w-10 h-10 object-cover rounded shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{warmer.game.name}</div>
                  <div className="text-xs text-white/40">${warmer.game.price}</div>
                </div>
                <div className="text-right shrink-0">
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Frown size={16} className="text-red-400" />
              <h4 className="text-sm font-medium text-white">Buyer&apos;s Remorse</h4>
              <span className="text-xs text-white/30">Could use more love</span>
            </div>
            {regretPurchases.length > 3 && (
              <button
                onClick={() => setShowAllRegrets(!showAllRegrets)}
                className="text-xs text-white/40 hover:text-white/70 transition-all"
              >
                {showAllRegrets ? 'Show Less' : `Show All (${regretPurchases.length})`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(showAllRegrets ? regretPurchases : regretPurchases.slice(0, 3)).map((regret) => (
              <div key={regret.game.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                {regret.game.thumbnail && (
                  <img
                    src={regret.game.thumbnail}
                    alt={regret.game.name}
                    className="w-10 h-10 object-cover rounded shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{regret.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${regret.game.price} • {regret.game.hours}h played
                  </div>
                </div>
                <div className="text-xs text-red-400 shrink-0">
                  Regret: {regret.regretScore.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-400/70 mt-3 italic">Give them another chance or accept the loss</p>
        </div>
      )}

      {/* Value Champion */}
      {valueChampion && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-emerald-400" />
            <h4 className="text-sm font-medium text-white">Value Champion</h4>
            <span className="text-xs text-white/30">Best $/hour</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              {valueChampion.game.thumbnail && (
                <img
                  src={valueChampion.game.thumbnail}
                  alt={valueChampion.game.name}
                  className="w-12 h-12 object-cover rounded shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{valueChampion.game.name}</div>
                <div className="text-xs text-white/40">{valueChampion.game.hours}h • ${valueChampion.game.price}</div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-400">${valueChampion.costPerHour.toFixed(2)}/hr</span>
            </div>
          </div>
        </div>
      )}

      {/* Most Invested Franchise */}
      {mostInvestedFranchise && (
        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} className="text-purple-400" />
            <h4 className="text-sm font-medium text-white">Franchise Fan</h4>
            <span className="text-xs text-white/30">Most invested</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-purple-400 mb-2">{mostInvestedFranchise.franchise}</div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <div className="text-sm font-semibold text-white/80">{mostInvestedFranchise.games}</div>
                <div className="text-white/30">games</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white/80">{mostInvestedFranchise.hours}h</div>
                <div className="text-white/30">played</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white/80">${mostInvestedFranchise.spent}</div>
                <div className="text-white/30">spent</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bargain Hunter */}
      {avgDiscount > 0 && (
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-blue-400" />
            <h4 className="text-sm font-medium text-white">Bargain Hunter</h4>
            <span className="text-xs text-white/30">Avg discount</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400 mb-1">{avgDiscount.toFixed(0)}%</div>
            <div className="text-xs text-white/40">
              {avgDiscount >= 50 ? '🏆 Elite Bargain Hunter!' : avgDiscount >= 30 ? '⭐ Great Deal Seeker!' : '👍 Smart Shopper!'}
            </div>
          </div>
        </div>
      )}

      {/* Speed Records */}
      {(fastestCompletion || slowestCompletion || longestSession) && (
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={16} className="text-yellow-400" />
            <h4 className="text-sm font-medium text-white">Speed Records</h4>
          </div>
          <div className="space-y-2">
            {fastestCompletion && (
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-xs text-white/40 mb-1">⚡ Speed Demon</div>
                <div className="flex items-center gap-3">
                  {fastestCompletion.game.thumbnail && (
                    <img
                      src={fastestCompletion.game.thumbnail}
                      alt={fastestCompletion.game.name}
                      className="w-10 h-10 object-cover rounded shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="text-sm text-white/80 truncate">{fastestCompletion.game.name}</span>
                    <span className="text-sm font-medium text-yellow-400 shrink-0 ml-2">{fastestCompletion.days}d</span>
                  </div>
                </div>
              </div>
            )}
            {slowestCompletion && (
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-xs text-white/40 mb-1">🐌 Slow Burn</div>
                <div className="flex items-center gap-3">
                  {slowestCompletion.game.thumbnail && (
                    <img
                      src={slowestCompletion.game.thumbnail}
                      alt={slowestCompletion.game.name}
                      className="w-10 h-10 object-cover rounded shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="text-sm text-white/80 truncate">{slowestCompletion.game.name}</span>
                    <span className="text-sm font-medium text-orange-400 shrink-0 ml-2">{slowestCompletion.days}d</span>
                  </div>
                </div>
              </div>
            )}
            {longestSession && (
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-xs text-white/40 mb-1">🎯 Marathon Session</div>
                <div className="flex items-center gap-3">
                  {longestSession.game.thumbnail && (
                    <img
                      src={longestSession.game.thumbnail}
                      alt={longestSession.game.name}
                      className="w-10 h-10 object-cover rounded shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="text-sm text-white/80 truncate">{longestSession.game.name}</span>
                    <span className="text-sm font-medium text-red-400 shrink-0 ml-2">{longestSession.hours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impulse Buyer */}
      {impulseBuyer !== null && impulseBuyer >= 0 && (
        <div className="p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-pink-400" />
            <h4 className="text-sm font-medium text-white">Impulse Buyer</h4>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-3xl font-bold text-pink-400 mb-1">{impulseBuyer.toFixed(0)}d</div>
            <div className="text-xs text-white/40">
              {impulseBuyer <= 1 ? '⚡ Instant Gratification!' : impulseBuyer <= 7 ? '🎮 Ready to Play!' : impulseBuyer <= 30 ? '📅 Patient Player' : '🕐 Strategic Buyer'}
            </div>
            <div className="text-xs text-white/30 mt-1">avg days to first play</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <GameListModal
        title="Century Club - 100+ Hours"
        games={centuryClub}
        isOpen={activeModal === 'centuryClub'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => (
          <div className="text-xs text-white/40 mt-0.5">
            {getTotalHours(game).toFixed(0)}h played • {game.rating}/10 rating
          </div>
        )}
      />

      <GameListModal
        title={`Patient Gamer - 30%+ Discounts`}
        games={games.filter(g =>
          !g.acquiredFree &&
          g.originalPrice &&
          g.originalPrice > g.price &&
          ((g.originalPrice - g.price) / g.originalPrice) >= 0.3 &&
          g.status !== 'Wishlist'
        )}
        isOpen={activeModal === 'patientGamer'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => {
          const discount = game.originalPrice && game.originalPrice > game.price
            ? ((game.originalPrice - game.price) / game.originalPrice * 100).toFixed(0)
            : '0';
          return (
            <div className="text-xs text-white/40 mt-0.5">
              ${game.price} (was ${game.originalPrice}) • {discount}% off
            </div>
          );
        }}
      />

      <GameListModal
        title="Free Games"
        games={freeGames}
        isOpen={activeModal === 'freeGames'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => (
          <div className="text-xs text-white/40 mt-0.5">
            Worth ${game.originalPrice || 0} • {game.subscriptionSource || 'Free'}
          </div>
        )}
      />

      <GameListModal
        title="Quick Fix - Completed in <10h"
        games={quickFix}
        isOpen={activeModal === 'quickFix'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => (
          <div className="text-xs text-white/40 mt-0.5">
            {getTotalHours(game).toFixed(1)}h to complete • {game.rating}/10 rating
          </div>
        )}
      />

      <GameListModal
        title="Shelf Warmers - Backlog Gathering Dust"
        games={shelfWarmers.map(w => w.game)}
        isOpen={activeModal === 'shelfWarmers'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => {
          const warmer = shelfWarmers.find(w => w.game.id === game.id);
          return (
            <div className="text-xs text-white/40 mt-0.5">
              ${game.price} • Sitting for {warmer ? Math.floor(warmer.daysSitting) : 0} days
            </div>
          );
        }}
      />

      <GameListModal
        title="Hidden Gems - Amazing Value Finds"
        games={hiddenGems.map(g => g.game)}
        isOpen={activeModal === 'hiddenGems'}
        onClose={() => setActiveModal(null)}
        renderGameInfo={(game) => {
          const costPerHour = getTotalHours(game) > 0 ? game.price / getTotalHours(game) : 0;
          return (
            <div className="text-xs text-white/40 mt-0.5">
              ${game.price} • {getTotalHours(game)}h • ${costPerHour.toFixed(2)}/hr
            </div>
          );
        }}
      />
    </div>
  );
}
