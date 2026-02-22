'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, Gamepad2, Loader2, Sparkles, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { Game, GameAward, AwardPeriodType } from '../lib/types';
import { generateAwardNarrative, AwardCeremonyNarrative, AwardNomineeInput } from '../lib/ai-service';
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────────────────

export interface AwardNominee {
  game: Game;
  reasonLine: string;   // e.g. "12.5h · 80% of your week"
  isHighlight?: boolean; // Previously won a related lower-tier award this period
}

export interface AwardCategoryDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  nominees: AwardNominee[];
  isAICategory?: boolean;   // AI named this category
  aiCategoryName?: string;  // Override label with AI-generated name
}

export interface GamingAwardsScreenProps {
  periodType: AwardPeriodType;
  periodKey: string;
  periodLabel: string;
  ceremonyTitle: string;
  categories: AwardCategoryDef[];
  /** Record<categoryId, gameId> — current picks already saved */
  existingPicks: Record<string, string>;
  onPick: (categoryId: string, game: Game, oldGameId: string | null) => void;
  /** Banner shown above categories — e.g. weekly winners context for month ceremony */
  contextBanner?: string;
  contextWinners?: Array<{ label: string; gameName: string; icon: string }>;
  allGames: Game[];
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
}

// ── Tier colours ────────────────────────────────────────────────

const TIER_STYLES: Record<AwardPeriodType, { accent: string; bg: string; border: string; badge: string }> = {
  week:    { accent: 'text-blue-300',   bg: 'from-blue-500/10 to-cyan-500/10',     border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300' },
  month:   { accent: 'text-yellow-300', bg: 'from-yellow-500/10 to-amber-500/10',  border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300' },
  quarter: { accent: 'text-purple-300', bg: 'from-purple-500/10 to-pink-500/10',   border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300' },
  year:    { accent: 'text-amber-300',  bg: 'from-amber-500/10 to-orange-500/10',  border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-300' },
};

/** Glow box-shadow for selected nominee cards, per tier */
const TIER_GLOW: Record<AwardPeriodType, { shadow: string; ring: string }> = {
  week:    { shadow: '0 0 0 2px #60a5fa, 0 0 14px rgba(96,165,250,0.35)',   ring: '#60a5fa' },
  month:   { shadow: '0 0 0 2px #fbbf24, 0 0 14px rgba(251,191,36,0.35)',   ring: '#fbbf24' },
  quarter: { shadow: '0 0 0 2px #c084fc, 0 0 14px rgba(192,132,252,0.35)', ring: '#c084fc' },
  year:    { shadow: '0 0 0 2px #f59e0b, 0 0 14px rgba(245,158,11,0.35)',   ring: '#f59e0b' },
};

// ── Main component ───────────────────────────────────────────────

export function GamingAwardsScreen({
  periodType,
  periodKey,
  periodLabel,
  ceremonyTitle,
  categories,
  existingPicks,
  onPick,
  contextBanner,
  contextWinners,
  allGames,
  updateGame,
}: GamingAwardsScreenProps) {
  const style = TIER_STYLES[periodType];
  const [picks, setPicks] = useState<Record<string, string>>(existingPicks);
  const [narrative, setNarrative] = useState<AwardCeremonyNarrative | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [openingShown, setOpeningShown] = useState(false);
  const narrativeFetched = useRef(false);

  // Keep refs so we always have fresh data for mutations
  // without the hook recreating callbacks on every parent re-render
  const allGamesRef = useRef(allGames);
  allGamesRef.current = allGames;
  const updateGameRef = useRef(updateGame);
  updateGameRef.current = updateGame;

  // Only sync picks when switching to a different period (not on every parent re-render)
  useEffect(() => {
    setPicks(existingPicks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // Fetch AI narrative once
  useEffect(() => {
    if (narrativeFetched.current) return;
    const nominees = categories
      .flatMap(c => c.nominees)
      .reduce<AwardNomineeInput[]>((acc, n) => {
        if (!acc.find(x => x.name === n.game.name)) {
          const playLogHours = (n.game.playLogs || []).reduce((s, l) => s + l.hours, 0);
          acc.push({
            name: n.game.name,
            hours: n.game.hours + playLogHours,
            rating: n.game.rating || 0,
            genre: n.game.genre,
            weeklyWins: contextWinners?.filter(w => w.gameName === n.game.name).length,
          });
        }
        return acc;
      }, []);

    if (nominees.length === 0) return;
    narrativeFetched.current = true;
    setLoadingAI(true);

    generateAwardNarrative({
      periodLabel,
      periodType,
      nominees,
      categories: categories.map(c => ({ id: c.id, label: c.aiCategoryName || c.label })),
      priorContext: contextBanner,
    }).then(n => {
      setNarrative(n);
      setLoadingAI(false);
      if (n.opening) setTimeout(() => setOpeningShown(true), 200);
    }).catch(() => setLoadingAI(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = async (categoryDef: AwardCategoryDef, nominee: AwardNominee) => {
    const oldGameId = picks[categoryDef.id] ?? null;
    const newGameId = nominee.game.id;

    // Optimistic UI
    setPicks(prev => ({ ...prev, [categoryDef.id]: newGameId }));

    const awardData: Omit<GameAward, 'id' | 'awardedAt'> = {
      category: categoryDef.id,
      categoryLabel: categoryDef.aiCategoryName || categoryDef.label,
      categoryIcon: categoryDef.icon,
      periodType,
      periodKey,
      periodLabel,
    };

    const newAward: GameAward = {
      id: uuidv4(),
      ...awardData,
      awardedAt: new Date().toISOString(),
    };

    // Persist directly via refs (avoids useAwards re-render cascade)
    const games = allGamesRef.current;
    const doUpdate = updateGameRef.current;

    const matchesSlot = (a: GameAward) =>
      a.category === awardData.category && a.periodKey === awardData.periodKey;

    if (oldGameId && oldGameId !== newGameId) {
      // Switching winner: strip from old, give to new (two updates)
      const oldGame = games.find(g => g.id === oldGameId);
      if (oldGame) {
        await doUpdate(oldGameId, {
          awards: (oldGame.awards || []).filter(a => !matchesSlot(a)),
        });
      }

      // Re-read ref to get fresh state after first update
      const freshGames = allGamesRef.current;
      const newGame = freshGames.find(g => g.id === newGameId);
      if (newGame) {
        const filtered = (newGame.awards || []).filter(a => !matchesSlot(a));
        await doUpdate(newGameId, { awards: [...filtered, newAward] });
      }
    } else {
      // First pick or re-picking same game: single update
      const newGame = games.find(g => g.id === newGameId);
      if (newGame) {
        const filtered = (newGame.awards || []).filter(a => !matchesSlot(a));
        await doUpdate(newGameId, { awards: [...filtered, newAward] });
      }
    }

    onPick(categoryDef.id, nominee.game, oldGameId);
  };

  const handleClearPick = async (categoryDef: AwardCategoryDef) => {
    const oldGameId = picks[categoryDef.id] ?? null;
    if (!oldGameId) return;

    // Optimistic UI — remove this category from local picks
    setPicks(prev => {
      const next = { ...prev };
      delete next[categoryDef.id];
      return next;
    });

    const games = allGamesRef.current;
    const doUpdate = updateGameRef.current;
    const oldGame = games.find(g => g.id === oldGameId);
    if (oldGame) {
      await doUpdate(oldGameId, {
        awards: (oldGame.awards || []).filter(
          a => !(a.category === categoryDef.id && a.periodKey === periodKey)
        ),
      });
    }
  };

  const totalPicked = Object.keys(picks).length;
  const totalCategories = categories.length;

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5"
      >
        <div className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2 text-xs font-bold uppercase tracking-wider', style.badge)}>
          <Trophy size={13} />
          {periodLabel} Awards
        </div>
        <h2 className="text-xl font-bold text-white">{ceremonyTitle}</h2>
        <p className="text-xs text-white/30 mt-0.5">{totalPicked}/{totalCategories} awarded</p>
      </motion.div>

      {/* Weekly/Monthly context winners */}
      {contextWinners && contextWinners.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 p-3 bg-white/3 rounded-xl border border-white/5"
        >
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Prior winners this period</p>
          <div className="flex flex-wrap gap-1.5">
            {contextWinners.map((w, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/50">
                {w.icon} {w.gameName} <span className="text-white/25">— {w.label}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Opening */}
      {(loadingAI || (narrative?.opening && openingShown)) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 bg-gradient-to-r from-white/3 to-transparent rounded-xl border border-white/8"
        >
          {loadingAI ? (
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Loader2 size={12} className="animate-spin" />
              Setting the scene...
            </div>
          ) : (
            <div className="flex gap-2">
              <Sparkles size={13} className={clsx('shrink-0 mt-0.5', style.accent)} />
              <p className="text-xs text-white/60 italic leading-relaxed">{narrative?.opening}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Categories */}
      <div className="space-y-5">
        {categories.map((cat, catIdx) => {
          const pickedId = picks[cat.id];
          const pitch = narrative?.pitches?.[cat.id];

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + catIdx * 0.08 }}
            >
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{cat.icon}</span>
                <div className="flex-1">
                  <span className={clsx('text-sm font-bold', pickedId ? 'text-white' : 'text-white/70')}>
                    {cat.aiCategoryName || cat.label}
                  </span>
                  {cat.isAICategory && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-bold">AI PICK</span>
                  )}
                </div>
                {pickedId && <CheckCircle2 size={14} className={style.accent} />}
              </div>
              <p className="text-[10px] text-white/30 mb-2.5 ml-7">{cat.description}</p>

              {/* Nominees — horizontal scroll */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 overscroll-x-contain" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                {cat.nominees.map((nominee) => {
                  const isPicked = pickedId === nominee.game.id;
                  const gamePitch = pitch?.[nominee.game.name];
                  const glow = TIER_GLOW[periodType];

                  return (
                    <motion.button
                      key={nominee.game.id}
                      onClick={() => handlePick(cat, nominee)}
                      whileTap={{ scale: 0.95 }}
                      className={clsx(
                        'shrink-0 w-32 rounded-xl border transition-all text-left overflow-hidden',
                        isPicked
                          ? clsx('border-2', style.border.replace('/20', '/70'), `bg-gradient-to-b ${style.bg}`)
                          : 'border-white/8 bg-white/3 hover:bg-white/6',
                      )}
                      style={isPicked ? { boxShadow: glow.shadow } : undefined}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-20 bg-white/3">
                        {nominee.game.thumbnail ? (
                          <img
                            src={nominee.game.thumbnail}
                            alt={nominee.game.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 size={22} className="text-white/10" />
                          </div>
                        )}
                        {isPicked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex flex-col items-center gap-0.5"
                            >
                              <span className="text-2xl">{cat.icon}</span>
                              <span className="text-[9px] font-bold text-white/90 bg-black/50 px-1.5 py-0.5 rounded">WINNER</span>
                            </motion.div>
                          </div>
                        )}
                        {nominee.isHighlight && !isPicked && (
                          <div className="absolute top-1 right-1">
                            <span className="text-[8px] px-1 py-0.5 bg-black/60 rounded text-yellow-400 font-bold">★ Prior</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <p className={clsx('text-[11px] font-bold leading-tight truncate', isPicked ? 'text-white' : 'text-white/70')}>
                          {nominee.game.name}
                        </p>
                        {isPicked && (
                          <p className="text-[9px] font-bold mt-0.5" style={{ color: glow.ring }}>✓ Selected</p>
                        )}
                        {!isPicked && (
                          <p className="text-[9px] text-white/35 mt-0.5 truncate">{nominee.reasonLine}</p>
                        )}
                        {gamePitch && !isPicked && (
                          <p className="text-[9px] text-white/40 italic mt-1 leading-tight line-clamp-2">{gamePitch}</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {cat.nominees.length === 0 && (
                  <div className="text-xs text-white/20 italic py-2">No nominees for this period</div>
                )}

                {/* None / Clear selection card */}
                {cat.nominees.length > 0 && (
                  <motion.button
                    onClick={() => handleClearPick(cat)}
                    whileTap={{ scale: 0.95 }}
                    disabled={!pickedId}
                    className={clsx(
                      'shrink-0 w-24 rounded-xl border transition-all text-left overflow-hidden',
                      pickedId
                        ? 'border-white/10 bg-white/[0.025] hover:border-red-500/40 hover:bg-red-500/5 cursor-pointer'
                        : 'border-white/5 bg-white/[0.01] opacity-35 cursor-not-allowed',
                    )}
                  >
                    <div className="h-20 flex items-center justify-center">
                      <span className="text-2xl opacity-50">✕</span>
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-white/40">None</p>
                      <p className="text-[9px] text-white/20 mt-0.5">Clear pick</p>
                    </div>
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion message */}
      <AnimatePresence>
        {totalPicked === totalCategories && totalCategories > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx('mt-6 p-4 rounded-xl border text-center', `bg-gradient-to-r ${style.bg}`, style.border)}
          >
            <div className="text-2xl mb-1">🏆</div>
            <p className={clsx('text-sm font-bold', style.accent)}>All {totalCategories} awards given!</p>
            <p className="text-xs text-white/30 mt-0.5">Check the trophy shelf on your game cards</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
