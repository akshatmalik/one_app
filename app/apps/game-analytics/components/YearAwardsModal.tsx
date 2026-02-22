'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { GamingAwardsScreen, AwardCategoryDef, AwardNominee } from './GamingAwardsScreen';
import { awardYearKey } from '../hooks/useAwards';
import { parseLocalDate } from '../lib/calculations';

interface YearAwardsModalProps {
  year: number;
  allGames: GameWithMetrics[];
  rawGames: Game[];
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onClose: () => void;
}

function hoursInYear(game: GameWithMetrics, year: number): number {
  return (game.playLogs || [])
    .filter(l => parseLocalDate(l.date).getFullYear() === year)
    .reduce((s, l) => s + l.hours, 0);
}

function bestSessionInYear(game: GameWithMetrics, year: number): number {
  return Math.max(
    0,
    ...(game.playLogs || [])
      .filter(l => parseLocalDate(l.date).getFullYear() === year)
      .map(l => l.hours)
  );
}

export function YearAwardsModal({ year, allGames, rawGames, updateGame, onClose }: YearAwardsModalProps) {
  const periodKey = awardYearKey(new Date(year, 0, 1));
  const periodLabel = `${year}`;

  // Prior quarterly winners — show as context
  const quarterlyWinners = useMemo(() => {
    const result: Array<{ label: string; gameName: string; icon: string }> = [];
    for (const g of rawGames) {
      for (const a of (g.awards || [])) {
        if (a.periodType === 'quarter' && a.periodKey.startsWith(`${year}-`)) {
          result.push({ label: a.categoryLabel, gameName: g.name, icon: a.categoryIcon });
        }
      }
    }
    return result;
  }, [rawGames, year]);

  // Existing picks
  const existingPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    for (const g of rawGames) {
      for (const a of (g.awards || [])) {
        if (a.periodType === 'year' && a.periodKey === periodKey) {
          picks[a.category] = g.id;
        }
      }
    }
    return picks;
  }, [rawGames, periodKey]);

  const played = useMemo(() =>
    allGames.filter(g =>
      (g.playLogs || []).some(l => parseLocalDate(l.date).getFullYear() === year)
    ),
    [allGames, year]
  );

  const byHours = [...played].sort((a, b) => hoursInYear(b, year) - hoursInYear(a, year));

  const toNominee = (g: GameWithMetrics, overrideReason?: string): AwardNominee => {
    const yHours = hoursInYear(g, year);
    const wins = quarterlyWinners.filter(w => w.gameName === g.name).length;
    return {
      game: g,
      reasonLine: overrideReason ?? `${yHours.toFixed(1)}h in ${year} · rated ${g.rating}/10`,
      isHighlight: wins > 0,
    };
  };

  // "The Soulmate" — high hours AND high rating
  const soulmates = [...played]
    .filter(g => g.rating >= 7 && hoursInYear(g, year) >= 10)
    .sort((a, b) => (hoursInYear(b, year) * b.rating) - (hoursInYear(a, year) * a.rating));

  // "Biggest Surprise" — games with more hours than expected for their initial rating
  const surprises = [...played]
    .filter(g => g.rating >= 7)
    .sort((a, b) => hoursInYear(b, year) - hoursInYear(a, year));

  // "Best Investment" — lowest cost-per-hour (paid games played this year)
  const bestValue = [...played]
    .filter(g => !g.acquiredFree && g.price > 0 && hoursInYear(g, year) > 0)
    .sort((a, b) => (a.price / hoursInYear(a, year)) - (b.price / hoursInYear(b, year)));

  // "Session of the Year" — highest single session
  const sessionChamps = [...played]
    .filter(g => bestSessionInYear(g, year) > 0)
    .sort((a, b) => bestSessionInYear(b, year) - bestSessionInYear(a, year));

  // "One That Got Away" — abandoned or high-playtime neglected games
  const gotAway = allGames
    .filter(g => g.status === 'Abandoned' || (g.status === 'In Progress' && hoursInYear(g, year) === 0 && (g.playLogs || []).length > 0))
    .sort((a, b) => (b.playLogs || []).reduce((s, l) => s + l.hours, 0) - (a.playLogs || []).reduce((s, l) => s + l.hours, 0));

  const categories: AwardCategoryDef[] = [
    {
      id: 'game_of_year',
      label: 'Game of the Year',
      icon: '🏆',
      description: `Your personal GOTY for ${year}. The one that defined your year.`,
      nominees: byHours.slice(0, 8).map(g => toNominee(g)),
    },
    {
      id: 'soulmate',
      label: 'The Soulmate',
      icon: '💛',
      description: 'The game you felt most connected to — hours, love, and all.',
      nominees: (soulmates.length > 0 ? soulmates : byHours).slice(0, 6)
        .map(g => toNominee(g, `${hoursInYear(g, year).toFixed(1)}h · rated ${g.rating}/10 · a keeper`)),
    },
    {
      id: 'biggest_surprise',
      label: 'Biggest Surprise',
      icon: '😮',
      description: 'You didn\'t see it coming. It exceeded every expectation.',
      nominees: (surprises.length > 0 ? surprises : byHours).slice(0, 6).map(g => toNominee(g)),
    },
    {
      id: 'endurance',
      label: 'The Endurance Award',
      icon: '⏳',
      description: 'Most committed. Most hours. The long haul game.',
      nominees: byHours.slice(0, 6)
        .map(g => toNominee(g, `${hoursInYear(g, year).toFixed(1)}h in ${year}`)),
    },
    {
      id: 'best_investment',
      label: 'Best Investment',
      icon: '💰',
      description: 'Best value for money — the game that gave the most per dollar.',
      nominees: (bestValue.length > 0 ? bestValue : byHours).slice(0, 6)
        .map(g => {
          const cph = g.price > 0 ? g.price / hoursInYear(g, year) : 0;
          return toNominee(g, cph > 0 ? `$${cph.toFixed(2)}/hr · $${g.price} for ${hoursInYear(g, year).toFixed(1)}h` : `${hoursInYear(g, year).toFixed(1)}h · free or subscription`);
        }),
    },
    {
      id: 'session_of_year',
      label: 'Session of the Year',
      icon: '⚡',
      description: 'The game that hosted your single greatest gaming moment of the year.',
      nominees: (sessionChamps.length > 0 ? sessionChamps : byHours).slice(0, 6)
        .map(g => toNominee(g, `Best session: ${bestSessionInYear(g, year).toFixed(1)}h`)),
    },
    {
      id: 'one_that_got_away',
      label: 'The One That Got Away',
      icon: '👻',
      description: 'A game you wish you\'d spent more time on. The one that haunts you.',
      nominees: (gotAway.length > 0 ? gotAway : allGames.filter(g => g.status === 'In Progress')).slice(0, 6)
        .map(g => toNominee(g, g.status === 'Abandoned' ? `Abandoned after ${(g.playLogs || []).reduce((s, l) => s + l.hours, 0).toFixed(1)}h` : `Still unfinished · ${hoursInYear(g, year).toFixed(1)}h this year`)),
    },
    {
      id: 'legacy',
      label: 'The Legacy',
      icon: '🌟',
      description: 'The game that changed how you think about gaming. Your benchmark.',
      nominees: byHours.slice(0, 8).map(g => toNominee(g)),
    },
    {
      id: 'ai_choice',
      label: 'AI Choice Award',
      icon: '🤖',
      description: 'The AI\'s surprising pick. A nomination you might not have expected.',
      nominees: byHours.slice(0, 6).map(g => toNominee(g)),
      isAICategory: true,
    },
  ];

  const [, setLocalPicks] = useState<Record<string, string>>(existingPicks);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-full sm:max-w-lg bg-[#0a0a0f] border-t sm:border border-amber-500/20 sm:rounded-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[92dvh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <span className="font-bold text-white text-sm">The {year} Awards</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full font-bold">Year-End</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70">
              <X size={14} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 min-h-0 py-4 overscroll-contain">
            <GamingAwardsScreen
              periodType="year"
              periodKey={periodKey}
              periodLabel={periodLabel}
              ceremonyTitle={`The ${year} Gaming Ceremony`}
              categories={categories}
              existingPicks={existingPicks}
              onPick={(catId, game) => setLocalPicks(p => ({ ...p, [catId]: game.id }))}
              contextBanner={quarterlyWinners.length > 0
                ? `Quarterly champions of ${year}: ${[...new Set(quarterlyWinners.map(w => w.gameName))].join(', ')}`
                : undefined}
              contextWinners={quarterlyWinners.slice(0, 8)}
              allGames={rawGames}
              updateGame={updateGame}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
