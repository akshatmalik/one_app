'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Gamepad2, Loader2, Sparkles, ChevronRight, Gift } from 'lucide-react';
import clsx from 'clsx';
import { Game, GameAward, AwardPeriodType } from '../lib/types';
import { generateAwardNarrative, AwardCeremonyNarrative, AwardNomineeInput } from '../lib/ai-service';
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────────────────

export interface AwardNominee {
  game: Game;
  reasonLine: string;
  isHighlight?: boolean;
}

export interface AwardCategoryDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  nominees: AwardNominee[];
  isAICategory?: boolean;
  aiCategoryName?: string;
}

export interface GamingAwardsScreenProps {
  periodType: AwardPeriodType;
  periodKey: string;
  periodLabel: string;
  ceremonyTitle: string;
  categories: AwardCategoryDef[];
  existingPicks: Record<string, string>;
  onPick: (categoryId: string, game: Game, oldGameId: string | null) => void;
  contextBanner?: string;
  contextWinners?: Array<{ label: string; gameName: string; icon: string }>;
  allGames: Game[];
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
}

// ── Tier styles ────────────────────────────────────────────────

const TIER_STYLES: Record<AwardPeriodType, {
  accent: string; bg: string; border: string; badge: string; pill: string;
}> = {
  week:    { accent: 'text-blue-300',   bg: 'from-blue-500/10 to-cyan-500/10',    border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300',    pill: 'bg-blue-500/25 border-blue-500/40 text-blue-200' },
  month:   { accent: 'text-yellow-300', bg: 'from-yellow-500/10 to-amber-500/10', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300', pill: 'bg-yellow-500/25 border-yellow-500/40 text-yellow-200' },
  quarter: { accent: 'text-purple-300', bg: 'from-purple-500/10 to-pink-500/10',  border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300', pill: 'bg-purple-500/25 border-purple-500/40 text-purple-200' },
  year:    { accent: 'text-amber-300',  bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-300',   pill: 'bg-amber-500/25 border-amber-500/40 text-amber-200' },
};

const TIER_GLOW: Record<AwardPeriodType, { shadow: string; ring: string }> = {
  week:    { shadow: '0 0 0 2px #60a5fa, 0 0 14px rgba(96,165,250,0.35)',   ring: '#60a5fa' },
  month:   { shadow: '0 0 0 2px #fbbf24, 0 0 14px rgba(251,191,36,0.35)',   ring: '#fbbf24' },
  quarter: { shadow: '0 0 0 2px #c084fc, 0 0 14px rgba(192,132,252,0.35)', ring: '#c084fc' },
  year:    { shadow: '0 0 0 2px #f59e0b, 0 0 14px rgba(245,158,11,0.35)',   ring: '#f59e0b' },
};

// ── Nominee card ─────────────────────────────────────────────────

interface NomineeCardProps {
  nominee: AwardNominee;
  isPicked: boolean;
  isAIPick: boolean;
  phase: 'pick' | 'reveal' | 'done';
  glow: { shadow: string; ring: string };
  style: { accent: string; bg: string; border: string; badge: string; pill: string };
  onClick: () => void;
  catIcon: string;
}

function NomineeCard({ nominee, isPicked, isAIPick, phase, glow, style, onClick, catIcon }: NomineeCardProps) {
  const isSelectable = phase === 'pick';
  const dimmed = phase === 'done' && !isPicked && !isAIPick;
  const agreedWithAI = isPicked && isAIPick && phase === 'done';

  return (
    <motion.button
      onClick={isSelectable ? onClick : undefined}
      whileTap={isSelectable ? { scale: 0.96 } : undefined}
      className={clsx(
        'w-full rounded-xl border text-left overflow-hidden transition-all',
        isSelectable ? 'cursor-pointer hover:border-white/20' : 'cursor-default',
        isPicked
          ? clsx('border-2 bg-gradient-to-b', style.bg, style.border.replace('/20', '/70'))
          : 'border-white/8 bg-white/3',
        dimmed && 'opacity-40',
      )}
      style={isPicked ? { boxShadow: glow.shadow } : isAIPick && phase === 'done' ? { boxShadow: '0 0 0 1.5px rgba(168,85,247,0.5)' } : undefined}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div className="absolute inset-0">
          {nominee.game.thumbnail ? (
            <img src={nominee.game.thumbnail} alt={nominee.game.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <Gamepad2 size={20} className="text-white/10" />
            </div>
          )}
          {/* Picked overlay pre-reveal */}
          {isPicked && phase === 'pick' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-2xl">{catIcon}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className={clsx('text-[11px] font-bold leading-tight truncate', isPicked || (isAIPick && phase === 'done') ? 'text-white' : 'text-white/60')}>
          {nominee.game.name}
        </p>
        <p className="text-[9px] text-white/30 mt-0.5 truncate">{nominee.reasonLine}</p>

        {/* Phase badges */}
        {phase === 'done' && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {agreedWithAI && (
              <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 rounded-full font-bold">🤝 Agreed</span>
            )}
            {!agreedWithAI && isPicked && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${glow.ring}28`, color: glow.ring }}>✓ You</span>
            )}
            {!agreedWithAI && isAIPick && (
              <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/25 text-purple-300 rounded-full font-bold">🤖 AI</span>
            )}
          </div>
        )}

        {isPicked && phase === 'pick' && (
          <p className="text-[9px] font-bold mt-1" style={{ color: glow.ring }}>✓ Selected</p>
        )}
      </div>
    </motion.button>
  );
}

// ── Summary screen ────────────────────────────────────────────────

interface SummaryProps {
  categories: AwardCategoryDef[];
  picks: Record<string, string>;
  allGames: Game[];
  style: { accent: string; bg: string; border: string; badge: string; pill: string };
  periodLabel: string;
}

function SummaryScreen({ categories, picks, allGames, style, periodLabel }: SummaryProps) {
  const agreedCount = categories.filter(cat => {
    const pickedId = picks[cat.id];
    const aiPickId = cat.nominees[0]?.game.id;
    return pickedId && pickedId === aiPickId;
  }).length;
  const totalPicked = categories.filter(c => picks[c.id]).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4 pb-8"
    >
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className={clsx('text-xl font-bold', style.accent)}>Ceremony Complete</h2>
        <p className="text-xs text-white/30 mt-1">{periodLabel} · {totalPicked}/{categories.length} awarded</p>
        {totalPicked > 0 && (
          <p className="text-[11px] text-white/35 mt-1">
            You and the AI agreed on {agreedCount}/{totalPicked} {agreedCount === totalPicked ? '— perfect alignment! 🤝' : ''}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {categories.map(cat => {
          const pickedId = picks[cat.id];
          const pickedGame = pickedId ? allGames.find(g => g.id === pickedId) : null;
          const aiPickId = cat.nominees[0]?.game.id;
          const agreed = pickedId && pickedId === aiPickId;

          return (
            <div
              key={cat.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-xl border',
                pickedGame ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.02] border-white/5',
              )}
            >
              <span className="text-lg shrink-0">{cat.icon}</span>
              {pickedGame?.thumbnail ? (
                <img src={pickedGame.thumbnail} alt={pickedGame.name} className="w-9 h-9 rounded-lg object-cover shrink-0" loading="lazy" />
              ) : pickedGame ? (
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Gamepad2 size={14} className="text-white/20" />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 font-bold uppercase tracking-wider">{cat.aiCategoryName || cat.label}</p>
                {pickedGame ? (
                  <p className="text-sm font-semibold text-white truncate">{pickedGame.name}</p>
                ) : (
                  <p className="text-sm text-white/20 italic">Skipped</p>
                )}
              </div>
              {agreed && <span className="text-[11px] shrink-0">🤝</span>}
              {pickedGame && !agreed && <CheckCircle2 size={14} className={clsx('shrink-0', style.accent)} />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

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
  const glow = TIER_GLOW[periodType];

  const [picks, setPicks] = useState<Record<string, string>>(existingPicks);
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [catPhases, setCatPhases] = useState<Record<string, 'pick' | 'reveal' | 'done'>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [narrative, setNarrative] = useState<AwardCeremonyNarrative | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const narrativeFetched = useRef(false);

  const allGamesRef = useRef(allGames);
  allGamesRef.current = allGames;
  const updateGameRef = useRef(updateGame);
  updateGameRef.current = updateGame;

  // Reset when period changes
  useEffect(() => {
    setPicks(existingPicks);
    setCurrentCatIndex(0);
    setCatPhases({});
    setShowSummary(false);
    narrativeFetched.current = false;
  }, [periodKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch AI narrative once per period
  useEffect(() => {
    if (narrativeFetched.current || categories.length === 0) return;
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
    }).then(n => { setNarrative(n); setLoadingAI(false); }).catch(() => setLoadingAI(false));
  }, [periodKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────

  const getPhase = (catId: string): 'pick' | 'reveal' | 'done' => catPhases[catId] ?? 'pick';

  const persistPick = async (categoryDef: AwardCategoryDef, nominee: AwardNominee) => {
    const oldGameId = picks[categoryDef.id] ?? null;
    const newGameId = nominee.game.id;
    setPicks(prev => ({ ...prev, [categoryDef.id]: newGameId }));

    const matchesSlot = (a: GameAward) => a.category === categoryDef.id && a.periodKey === periodKey;
    const newAward: GameAward = {
      id: uuidv4(),
      category: categoryDef.id,
      categoryLabel: categoryDef.aiCategoryName || categoryDef.label,
      categoryIcon: categoryDef.icon,
      periodType,
      periodKey,
      periodLabel,
      awardedAt: new Date().toISOString(),
    };

    const games = allGamesRef.current;
    const doUpdate = updateGameRef.current;

    if (oldGameId && oldGameId !== newGameId) {
      const oldGame = games.find(g => g.id === oldGameId);
      if (oldGame) await doUpdate(oldGameId, { awards: (oldGame.awards || []).filter(a => !matchesSlot(a)) });
      const freshGames = allGamesRef.current;
      const newGame = freshGames.find(g => g.id === newGameId);
      if (newGame) await doUpdate(newGameId, { awards: [...(newGame.awards || []).filter(a => !matchesSlot(a)), newAward] });
    } else {
      const newGame = games.find(g => g.id === newGameId);
      if (newGame) await doUpdate(newGameId, { awards: [...(newGame.awards || []).filter(a => !matchesSlot(a)), newAward] });
    }

    onPick(categoryDef.id, nominee.game, oldGameId);
  };

  const handleNomineeTap = (categoryDef: AwardCategoryDef, nominee: AwardNominee) => {
    if (getPhase(categoryDef.id) !== 'pick') return;
    // Toggle: clicking the already-selected nominee deselects it; clicking another switches
    setPicks(prev => {
      if (prev[categoryDef.id] === nominee.game.id) {
        const next = { ...prev };
        delete next[categoryDef.id];
        return next;
      }
      return { ...prev, [categoryDef.id]: nominee.game.id };
    });
  };

  const handleOpenEnvelope = (categoryDef: AwardCategoryDef) => {
    // Persist whichever pick is selected (if any), then reveal AI pick
    const pickedNomineeId = picks[categoryDef.id];
    if (pickedNomineeId) {
      const nominee = categoryDef.nominees.find(n => n.game.id === pickedNomineeId);
      if (nominee) persistPick(categoryDef, nominee);
    }
    setCatPhases(prev => ({ ...prev, [categoryDef.id]: 'done' }));
  };

  const advanceToNext = () => {
    if (currentCatIndex < categories.length - 1) {
      setCurrentCatIndex(i => i + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = (catId: string) => {
    setCatPhases(prev => ({ ...prev, [catId]: 'done' }));
    advanceToNext();
  };

  // ── Render ───────────────────────────────────────────────────

  if (showSummary) {
    return (
      <SummaryScreen
        categories={categories}
        picks={picks}
        allGames={allGames}
        style={style}
        periodLabel={periodLabel}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 text-center py-12">
        <p className="text-white/30 text-sm">No award categories available for this period.</p>
      </div>
    );
  }

  const cat = categories[currentCatIndex];
  const phase = getPhase(cat.id);
  const pickedId = picks[cat.id];
  const aiPickId = cat.nominees[0]?.game.id;
  const agreed = pickedId && pickedId === aiPickId;
  const pickedGameName = pickedId ? allGames.find(g => g.id === pickedId)?.name : null;

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', style.badge)}>
          <span>{cat.icon}</span>
          <span>{currentCatIndex + 1} / {categories.length}</span>
        </div>
        <div className="flex gap-1">
          {categories.map((c, i) => (
            <div
              key={c.id}
              className={clsx(
                'h-1 rounded-full transition-all',
                i === currentCatIndex ? 'w-5 bg-white' : i < currentCatIndex ? 'w-2 bg-white/50' : 'w-2 bg-white/15',
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={cat.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {/* Category title */}
          <div className="mb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
              <span>{cat.icon}</span>
              <span>{cat.aiCategoryName || cat.label}</span>
              {cat.isAICategory && (
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-bold">AI PICK</span>
              )}
            </h2>

            {/* Description */}
            <div className="mt-1.5 min-h-[28px]">
              {loadingAI ? (
                <div className="flex items-center gap-1.5 text-white/25 text-xs">
                  <Loader2 size={11} className="animate-spin" />
                  <span>Setting the scene...</span>
                </div>
              ) : narrative?.opening ? (
                <div className="flex items-start gap-1.5">
                  <Sparkles size={11} className={clsx('mt-0.5 shrink-0', style.accent)} />
                  <p className="text-xs text-white/50 italic leading-relaxed">{cat.description}</p>
                </div>
              ) : (
                <p className="text-xs text-white/45 leading-relaxed">{cat.description}</p>
              )}
            </div>
          </div>

          {/* Context winners (first category only) */}
          {contextWinners && contextWinners.length > 0 && currentCatIndex === 0 && (
            <div className="mb-3 p-2.5 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mb-1.5">Prior winners</p>
              <div className="flex flex-wrap gap-1">
                {contextWinners.map((w, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded-full text-white/40">
                    {w.icon} {w.gameName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pick hint */}
          {phase === 'pick' && cat.nominees.length > 0 && (
            <p className="text-[10px] text-white/25 text-center mb-3">
              Pick your winner — AI&apos;s pick hidden until reveal
            </p>
          )}

          {/* 2-column nominee grid */}
          {cat.nominees.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {cat.nominees.map((nominee) => (
                <NomineeCard
                  key={nominee.game.id}
                  nominee={nominee}
                  isPicked={pickedId === nominee.game.id}
                  isAIPick={nominee.game.id === aiPickId}
                  phase={phase}
                  glow={glow}
                  style={style}
                  onClick={() => handleNomineeTap(cat, nominee)}
                  catIcon={cat.icon}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/20 text-sm italic mb-4">No nominees this period</div>
          )}

          {/* CTAs based on phase */}
          {phase === 'pick' && (
            <div className="flex flex-col gap-2">
              {pickedId && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenEnvelope(cat)}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border font-bold text-sm',
                    `bg-gradient-to-r ${style.bg}`,
                    style.border,
                    style.accent,
                  )}
                >
                  <Gift size={16} />
                  Open Envelope — See AI&apos;s Pick
                </motion.button>
              )}
              <button
                onClick={() => handleSkip(cat.id)}
                className="w-full text-[11px] text-white/20 hover:text-white/35 transition-colors py-2 text-center"
              >
                Skip this award
              </button>
            </div>
          )}

          {phase === 'done' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {/* Comparison */}
              <div className={clsx('p-3 rounded-xl border mb-3 text-center text-sm', `bg-gradient-to-r ${style.bg}`, style.border)}>
                {agreed ? (
                  <p className="font-bold text-emerald-300">🤝 You and the AI agreed!</p>
                ) : pickedGameName ? (
                  <>
                    <p className="text-white/55 text-xs">
                      You picked <span className="text-white font-bold">{pickedGameName}</span>
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      AI thought <span className="text-purple-300 font-bold">{cat.nominees[0]?.game.name}</span>
                    </p>
                    <p className="text-[10px] text-white/25 italic mt-1">Your pick is the winner. ✓</p>
                  </>
                ) : (
                  <p className="text-white/35 text-xs italic">Award skipped</p>
                )}
              </div>

              {/* Collect & Next */}
              <button
                onClick={advanceToNext}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border transition-all',
                  currentCatIndex < categories.length - 1 ? style.pill : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                )}
              >
                {currentCatIndex < categories.length - 1 ? (
                  <>
                    <span>🏆 Collect</span>
                    <ChevronRight size={15} />
                    <span className="text-xs opacity-60">
                      {categories[currentCatIndex + 1]?.icon} {categories[currentCatIndex + 1]?.label}
                    </span>
                  </>
                ) : (
                  <>
                    <span>🎬 See All Results</span>
                    <ChevronRight size={15} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
