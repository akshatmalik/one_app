'use client';

import { useState, useMemo } from 'react';
import {
  Trophy, Medal, Award, Star, ChevronDown, ChevronUp, Crown,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  getMilestones,
  getCollectionTrophies,
  getMonthlyAwards,
  TrophyTier,
} from '../lib/calculations';
import clsx from 'clsx';

interface TrophyRoomProps {
  games: Game[];
  userOverrides?: Record<string, string>; // awardId -> gameId
  onSelectWinner?: (awardId: string, gameId: string) => void;
}

const TIER_COLORS: Record<TrophyTier, string> = {
  bronze: 'text-amber-700',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-300',
};

const TIER_BG: Record<TrophyTier, string> = {
  bronze: 'bg-amber-900/20 border-amber-700/30',
  silver: 'bg-gray-400/10 border-gray-400/20',
  gold: 'bg-yellow-500/10 border-yellow-500/20',
  platinum: 'bg-cyan-500/10 border-cyan-500/20',
};

export function TrophyRoom({ games, userOverrides = {}, onSelectWinner }: TrophyRoomProps) {
  const milestones = useMemo(() => getMilestones(games), [games]);
  const trophies = useMemo(() => getCollectionTrophies(games), [games]);
  const now = new Date();
  const awards = useMemo(() => getMonthlyAwards(games, now.getFullYear(), now.getMonth()), [games]);
  const prevAwards = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return getMonthlyAwards(games, prev.getFullYear(), prev.getMonth());
  }, [games]);

  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [showAllTrophies, setShowAllTrophies] = useState(false);
  const [expandedAward, setExpandedAward] = useState<string | null>(null);

  const achievedMilestones = milestones.filter(m => m.achieved);
  const upcomingMilestones = milestones.filter(m => !m.achieved);
  const earnedTrophies = trophies.filter(t => t.earned);
  const lockedTrophies = trophies.filter(t => !t.earned);

  if (games.filter(g => g.status !== 'Wishlist').length === 0) return null;

  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthName = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Trophy size={14} className="text-yellow-400" />
        Trophy Room
      </h3>

      {/* Milestones */}
      <div className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl">
        <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
          <Medal size={14} className="text-amber-400" />
          Milestones
          <span className="text-[10px] text-white/30 ml-auto">
            {achievedMilestones.length}/{milestones.length} unlocked
          </span>
        </h4>

        {/* Achieved milestones */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {achievedMilestones.slice(0, showAllMilestones ? undefined : 8).map(m => (
            <div
              key={m.id}
              className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center"
              title={m.description}
            >
              <div className="text-lg">{m.icon}</div>
              <div className="text-[10px] text-amber-400 font-medium truncate">{m.name}</div>
            </div>
          ))}
        </div>

        {achievedMilestones.length > 8 && (
          <button
            onClick={() => setShowAllMilestones(!showAllMilestones)}
            className="w-full text-xs text-white/30 hover:text-white/50 flex items-center justify-center gap-1 transition-colors"
          >
            {showAllMilestones ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAllMilestones ? 'Show less' : `+${achievedMilestones.length - 8} more`}
          </button>
        )}

        {/* Next milestones */}
        {upcomingMilestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Next Up</div>
            <div className="space-y-2">
              {upcomingMilestones
                .sort((a, b) => {
                  // Sort by closest to completion
                  const aProgress = a.value ? ((a.value - 1) / a.value) * 100 : 0;
                  const bProgress = b.value ? ((b.value - 1) / b.value) * 100 : 0;
                  return bProgress - aProgress;
                })
                .slice(0, 3)
                .map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-sm opacity-50">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/50 truncate">{m.name}</div>
                      <div className="text-[10px] text-white/30">{m.description}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Trophies */}
      <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl">
        <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
          <Award size={14} className="text-cyan-400" />
          Collection Trophies
          <span className="text-[10px] text-white/30 ml-auto">
            {earnedTrophies.length}/{trophies.length} earned
          </span>
        </h4>

        {/* Earned trophies */}
        <div className="space-y-2 mb-3">
          {earnedTrophies.slice(0, showAllTrophies ? undefined : 6).map(t => (
            <div
              key={t.id}
              className={clsx('flex items-center gap-3 p-2 rounded-lg border', TIER_BG[t.tier])}
            >
              <span className="text-lg">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/80">{t.name}</span>
                  <span className={clsx('text-[9px] uppercase font-bold', TIER_COLORS[t.tier])}>{t.tier}</span>
                </div>
                <div className="text-[10px] text-white/40">{t.description}</div>
              </div>
            </div>
          ))}
        </div>

        {earnedTrophies.length > 6 && (
          <button
            onClick={() => setShowAllTrophies(!showAllTrophies)}
            className="w-full text-xs text-white/30 hover:text-white/50 flex items-center justify-center gap-1 transition-colors mb-3"
          >
            {showAllTrophies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAllTrophies ? 'Show less' : `+${earnedTrophies.length - 6} more`}
          </button>
        )}

        {/* Locked trophies (progress) */}
        {lockedTrophies.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">In Progress</div>
            <div className="space-y-2">
              {lockedTrophies
                .filter(t => t.progress > 0)
                .slice(0, 4)
                .map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-sm opacity-30">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{t.name}</span>
                        <span className="text-[10px] text-white/30">{Math.round(t.progress)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-white/20 rounded-full transition-all"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Awards */}
      {(awards.length > 0 || prevAwards.length > 0) && (
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Crown size={14} className="text-yellow-400" />
            Monthly Awards
          </h4>

          {/* Current month */}
          {awards.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">{currentMonthName}</div>
              <div className="space-y-2">
                {awards.map(award => (
                  <div key={award.id} className="bg-white/[0.03] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedAward(expandedAward === `curr-${award.id}` ? null : `curr-${award.id}`)}
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm">{award.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/70">{award.name}</div>
                        {award.autoWinner && (
                          <div className="text-[10px] text-white/40 truncate">
                            {award.autoWinner.game.name} — {award.autoWinner.stat}
                          </div>
                        )}
                      </div>
                      <ChevronDown size={12} className={clsx(
                        'text-white/20 transition-transform',
                        expandedAward === `curr-${award.id}` && 'rotate-180'
                      )} />
                    </button>

                    {expandedAward === `curr-${award.id}` && (
                      <div className="px-2 pb-2 space-y-1">
                        {award.nominees.map((nominee, i) => (
                          <button
                            key={nominee.game.id}
                            onClick={() => onSelectWinner?.(award.id, nominee.game.id)}
                            className={clsx(
                              'w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors text-xs',
                              (userOverrides[award.id] === nominee.game.id ||
                                (!userOverrides[award.id] && i === 0))
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'text-white/40 hover:bg-white/5'
                            )}
                          >
                            {nominee.game.thumbnail ? (
                              <img src={nominee.game.thumbnail} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" />
                            ) : (
                              <div className="w-6 h-6 rounded bg-white/5" />
                            )}
                            <span className="flex-1 truncate">{nominee.game.name}</span>
                            <span className="text-[10px] opacity-60">{nominee.stat}</span>
                            {(userOverrides[award.id] === nominee.game.id ||
                              (!userOverrides[award.id] && i === 0)) && (
                              <Star size={10} className="text-yellow-400 shrink-0" />
                            )}
                          </button>
                        ))}
                        <p className="text-[9px] text-white/20 text-center pt-1">
                          Tap to pick your winner
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous month */}
          {prevAwards.length > 0 && (
            <div className="pt-3 border-t border-white/5">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">{prevMonthName}</div>
              <div className="space-y-2">
                {prevAwards.map(award => (
                  <div key={`prev-${award.id}`} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                    <span className="text-sm">{award.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/50">{award.name}</div>
                      {award.autoWinner && (
                        <div className="text-[10px] text-white/30 truncate">
                          {award.autoWinner.game.name} — {award.autoWinner.stat}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
