'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, Gamepad2, Loader2, Sparkles, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { Game, GameAward, AwardPeriodType } from '../lib/types';
import { useAwards } from '../hooks/useAwards';
import { generateAwardNarrative, AwardCeremonyNarrative, AwardNomineeInput } from '../lib/ai-service';

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

  const { changePick } = useAwards(allGames, updateGame);

  // Sync existingPicks into local state
  useEffect(() => {
    setPicks(existingPicks);
  }, [existingPicks]);

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

    // Persist via changePick (strips old winner, awards new)
    const awardData: Omit<GameAward, 'id' | 'awardedAt'> = {
      category: categoryDef.id,
      categoryLabel: categoryDef.aiCategoryName || categoryDef.label,
      categoryIcon: categoryDef.icon,
      periodType,
      periodKey,
      periodLabel,
    };
    await changePick(newGameId, oldGameId, awardData);

    onPick(categoryDef.id, nominee.game, oldGameId);
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

                  return (
                    <motion.button
                      key={nominee.game.id}
                      onClick={() => handlePick(cat, nominee)}
                      whileTap={{ scale: 0.95 }}
                      className={clsx(
                        'shrink-0 w-32 rounded-xl border transition-all text-left overflow-hidden',
                        isPicked
                          ? clsx('border-2', style.border.replace('border-', 'border-').replace('/20', '/60'), `bg-gradient-to-b ${style.bg}`)
                          : 'border-white/8 bg-white/3 hover:bg-white/6',
                      )}
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
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-2xl"
                            >
                              {cat.icon}
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
                        <p className="text-[9px] text-white/35 mt-0.5 truncate">{nominee.reasonLine}</p>
                        {gamePitch && (
                          <p className="text-[9px] text-white/40 italic mt-1 leading-tight line-clamp-2">{gamePitch}</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {cat.nominees.length === 0 && (
                  <div className="text-xs text-white/20 italic py-2">No nominees for this period</div>
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
