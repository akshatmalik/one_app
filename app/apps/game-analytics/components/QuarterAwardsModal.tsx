'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { GamingAwardsScreen, AwardCategoryDef, AwardNominee } from './GamingAwardsScreen';
import { awardQuarterKey, awardQuarterLabel } from '../hooks/useAwards';
import { parseLocalDate } from '../lib/calculations';

interface QuarterAwardsModalProps {
  /** Quarter number 1-4 */
  quarter: number;
  year: number;
  allGames: GameWithMetrics[];
  rawGames: Game[];
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onClose: () => void;
}

/** Games played in any session during the quarter */
function gamesPlayedInQuarter(games: GameWithMetrics[], year: number, quarter: number): GameWithMetrics[] {
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);

  return games.filter(g => {
    const logs = g.playLogs || [];
    return logs.some(l => {
      const d = parseLocalDate(l.date);
      return d >= qStart && d <= qEnd;
    });
  });
}

/** Total hours in the quarter for a game */
function hoursInQuarter(game: GameWithMetrics, year: number, quarter: number): number {
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  return (game.playLogs || [])
    .filter(l => { const d = parseLocalDate(l.date); return d >= qStart && d <= qEnd; })
    .reduce((s, l) => s + l.hours, 0);
}

/** Check if this is the first time a genre appears in the quarter (new for user this quarter) */
function newGenresInQuarter(games: GameWithMetrics[], year: number, quarter: number): Set<string> {
  const qStart = new Date(year, (quarter - 1) * 3, 1);
  // Genres played before this quarter
  const priorGenres = new Set<string>();
  for (const g of games) {
    if (!g.genre) continue;
    const hasPreQuarter = (g.playLogs || []).some(l => parseLocalDate(l.date) < qStart);
    if (hasPreQuarter || (g.startDate && parseLocalDate(g.startDate) < qStart)) {
      priorGenres.add(g.genre);
    }
  }
  // Genres that appear this quarter but not before
  const newGenres = new Set<string>();
  for (const g of games) {
    if (!g.genre || priorGenres.has(g.genre)) continue;
    const playedThisQ = (g.playLogs || []).some(l => {
      const d = parseLocalDate(l.date);
      return d >= qStart && d <= new Date(year, quarter * 3, 0, 23, 59, 59);
    });
    if (playedThisQ) newGenres.add(g.genre);
  }
  return newGenres;
}

export function QuarterAwardsModal({ quarter, year, allGames, rawGames, updateGame, onClose }: QuarterAwardsModalProps) {
  const periodKey = awardQuarterKey(new Date(year, (quarter - 1) * 3, 1));
  const periodLabel = awardQuarterLabel(year, quarter);

  // Monthly winners within this quarter — show as context
  const monthlyWinners = useMemo(() => {
    const result: Array<{ label: string; gameName: string; icon: string }> = [];
    for (const g of rawGames) {
      for (const a of (g.awards || [])) {
        if (
          a.periodType === 'month' &&
          a.periodKey.startsWith(`${year}-`) &&
          (() => {
            const monthNum = parseInt(a.periodKey.split('-')[1]);
            const q = Math.ceil(monthNum / 3);
            return q === quarter;
          })()
        ) {
          result.push({ label: a.categoryLabel, gameName: a.periodLabel ? g.name : g.name, icon: a.categoryIcon });
        }
      }
    }
    return result;
  }, [rawGames, year, quarter]);

  // Existing picks for this quarter
  const existingPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    for (const g of rawGames) {
      for (const a of (g.awards || [])) {
        if (a.periodType === 'quarter' && a.periodKey === periodKey) {
          picks[a.category] = g.id;
        }
      }
    }
    return picks;
  }, [rawGames, periodKey]);

  // Compute nominees
  const played = useMemo(() => gamesPlayedInQuarter(allGames, year, quarter), [allGames, year, quarter]);
  const newGenres = useMemo(() => newGenresInQuarter(allGames, year, quarter), [allGames, year, quarter]);

  const toNominee = (g: GameWithMetrics, overrideReason?: string): AwardNominee => {
    const qHours = hoursInQuarter(g, year, quarter);
    const wins = monthlyWinners.filter(w => w.gameName === g.name).length;
    return {
      game: g,
      reasonLine: overrideReason ?? `${qHours.toFixed(1)}h this quarter · rated ${g.rating}/10`,
      isHighlight: wins > 0,
    };
  };

  const byHours = [...played].sort((a, b) => hoursInQuarter(b, year, quarter) - hoursInQuarter(a, year, quarter));

  // "The Grower" — games where avg session length increased over the quarter
  const growerNominees = played.filter(g => {
    const logs = (g.playLogs || [])
      .filter(l => {
        const d = parseLocalDate(l.date);
        return d >= new Date(year, (quarter - 1) * 3, 1) && d <= new Date(year, quarter * 3, 0);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length < 3) return false;
    const firstHalf = logs.slice(0, Math.floor(logs.length / 2));
    const secondHalf = logs.slice(Math.floor(logs.length / 2));
    const avgFirst = firstHalf.reduce((s, l) => s + l.hours, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, l) => s + l.hours, 0) / secondHalf.length;
    return avgSecond > avgFirst * 1.2;
  });

  // "Most Consistent" — games with evenly-spaced sessions (low std-dev in gaps)
  const consistentNominees = played.filter(g => {
    const logs = (g.playLogs || [])
      .filter(l => {
        const d = parseLocalDate(l.date);
        return d >= new Date(year, (quarter - 1) * 3, 1) && d <= new Date(year, quarter * 3, 0);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    if (logs.length < 3) return false;
    const gaps = logs.slice(1).map((l, i) =>
      (parseLocalDate(l.date).getTime() - parseLocalDate(logs[i].date).getTime()) / 86400000
    );
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - avg) ** 2, 0) / gaps.length;
    return Math.sqrt(variance) < avg * 0.6 && avg < 15; // consistent spacing, not too sparse
  });

  // "Best Discovery" — games with first session in this quarter
  const discoveryNominees = played.filter(g => {
    const qStart = new Date(year, (quarter - 1) * 3, 1);
    const firstLog = (g.playLogs || []).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!firstLog) return false;
    return parseLocalDate(firstLog.date) >= qStart;
  });

  // "The Grind" — high hours despite rating <= 6
  const grindNominees = played
    .filter(g => g.rating > 0 && g.rating <= 7 && hoursInQuarter(g, year, quarter) >= 5)
    .sort((a, b) => hoursInQuarter(b, year, quarter) - hoursInQuarter(a, year, quarter));

  // "Genre Pioneer" — games in a genre new for the user this quarter
  const pioneerNominees = played.filter(g => g.genre && newGenres.has(g.genre));

  const categories: AwardCategoryDef[] = [
    {
      id: 'game_of_quarter',
      label: 'Game of the Quarter',
      icon: '🥇',
      description: 'The defining game of these three months.',
      nominees: byHours.slice(0, 6).map(g => toNominee(g)),
    },
    {
      id: 'the_grower',
      label: 'The Grower',
      icon: '📈',
      description: 'Sessions got longer and better as you played more.',
      nominees: (growerNominees.length > 0 ? growerNominees : byHours.slice(0, 4))
        .map(g => toNominee(g, `Sessions got longer over the quarter · ${hoursInQuarter(g, year, quarter).toFixed(1)}h total`)),
    },
    {
      id: 'most_consistent',
      label: 'Most Consistent',
      icon: '🎯',
      description: 'Showed up for this one regularly — steady sessions all quarter.',
      nominees: (consistentNominees.length > 0 ? consistentNominees : byHours.slice(0, 4))
        .map(g => toNominee(g, `Regular sessions throughout the quarter · ${(g.playLogs || []).filter(l => {
          const d = parseLocalDate(l.date);
          return d >= new Date(year, (quarter - 1) * 3, 1) && d <= new Date(year, quarter * 3, 0);
        }).length} sessions`)),
    },
    {
      id: 'best_discovery',
      label: 'Best Discovery',
      icon: '💎',
      description: 'A standout game you found or started for the first time this quarter.',
      nominees: (discoveryNominees.length > 0 ? discoveryNominees : byHours.slice(0, 4))
        .map(g => toNominee(g, `First played this quarter · rated ${g.rating}/10`)),
    },
    {
      id: 'disappointment_quarter',
      label: 'Biggest Disappointment',
      icon: '😤',
      description: "It let you down. Pick the game that didn't live up to the hype or your hopes.",
      nominees: byHours.slice(0, 5).map(g => toNominee(g)),
    },
    {
      id: 'the_grind',
      label: 'The Grind',
      icon: '💪',
      description: 'You put in the hours even when it was hard or not your favourite.',
      nominees: (grindNominees.length > 0 ? grindNominees : byHours.slice(0, 4))
        .map(g => toNominee(g, `${hoursInQuarter(g, year, quarter).toFixed(1)}h despite rating ${g.rating}/10`)),
    },
    {
      id: 'genre_pioneer',
      label: 'Genre Pioneer',
      icon: '🎭',
      description: 'Ventured into a genre you hadn\'t really explored before.',
      nominees: (pioneerNominees.length > 0 ? pioneerNominees : byHours.slice(0, 4))
        .map(g => toNominee(g, `First ${g.genre || 'new genre'} game for you · ${hoursInQuarter(g, year, quarter).toFixed(1)}h`)),
    },
    {
      id: 'ai_spotlight',
      label: 'AI Spotlight',
      icon: '🤖',
      description: 'The AI\'s pick — something interesting from your quarter worth recognising.',
      nominees: byHours.slice(0, 5).map(g => toNominee(g)),
      isAICategory: true,
    },
  ];

  const [localPicks, setLocalPicks] = useState<Record<string, string>>(existingPicks);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-[#0a0a0f] border-t sm:border border-purple-500/20 sm:rounded-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[92dvh]"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-purple-400" />
              <span className="font-bold text-white text-sm">{periodLabel} — Awards</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70">
              <X size={14} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 min-h-0 py-4 overscroll-contain">
            <GamingAwardsScreen
              periodType="quarter"
              periodKey={periodKey}
              periodLabel={periodLabel}
              ceremonyTitle={`${periodLabel} Honours`}
              categories={categories}
              existingPicks={existingPicks}
              onPick={(catId, game, oldId) => setLocalPicks(p => ({ ...p, [catId]: game.id }))}
              contextBanner={monthlyWinners.length > 0 ? `Monthly winners this quarter: ${[...new Set(monthlyWinners.map(w => w.gameName))].join(', ')}` : undefined}
              contextWinners={monthlyWinners}
              allGames={rawGames}
              updateGame={updateGame}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
