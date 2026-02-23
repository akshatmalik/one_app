'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Check, Trophy } from 'lucide-react';
import { OscarAward, OscarNominee } from '../../lib/calculations';
import { castOscarVote, getOscarVote, OscarPeriodType } from '../../lib/oscar-storage';
import clsx from 'clsx';

// ── Category colour theming ────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, {
  gradient: string;
  border: string;
  accent: string;
  ring: string;
}> = {
  best_picture:         { gradient: 'from-yellow-900/70 to-amber-900/50',    border: 'border-yellow-500/30',   accent: 'text-yellow-300',   ring: 'ring-yellow-400/60' },
  best_supporting:      { gradient: 'from-slate-800/70 to-gray-900/50',       border: 'border-slate-400/30',    accent: 'text-slate-300',    ring: 'ring-slate-400/60' },
  best_short_film:      { gradient: 'from-blue-900/70 to-cyan-900/50',        border: 'border-blue-500/30',     accent: 'text-blue-300',     ring: 'ring-blue-400/60' },
  biggest_plot_twist:   { gradient: 'from-purple-900/70 to-violet-900/50',    border: 'border-purple-500/30',   accent: 'text-purple-300',   ring: 'ring-purple-400/60' },
  lifetime_achievement: { gradient: 'from-orange-900/70 to-amber-900/50',     border: 'border-orange-400/30',   accent: 'text-orange-300',   ring: 'ring-orange-400/60' },
  best_comeback:        { gradient: 'from-emerald-900/70 to-green-900/50',    border: 'border-emerald-500/30',  accent: 'text-emerald-300',  ring: 'ring-emerald-400/60' },
  worst_bang_for_buck:  { gradient: 'from-red-900/70 to-rose-900/50',         border: 'border-red-500/30',      accent: 'text-red-300',      ring: 'ring-red-400/60' },
  sleeper_hit:          { gradient: 'from-teal-900/70 to-cyan-900/50',        border: 'border-teal-500/30',     accent: 'text-teal-300',     ring: 'ring-teal-400/60' },
  most_likely_abandoned:{ gradient: 'from-orange-900/70 to-red-900/50',       border: 'border-orange-500/30',   accent: 'text-orange-300',   ring: 'ring-orange-400/60' },
  iron_man:             { gradient: 'from-violet-900/70 to-purple-900/50',    border: 'border-violet-500/30',   accent: 'text-violet-300',   ring: 'ring-violet-400/60' },
};

const DEFAULT_COLORS = {
  gradient: 'from-purple-900/70 to-violet-900/50',
  border: 'border-purple-500/30',
  accent: 'text-purple-300',
  ring: 'ring-purple-400/60',
};

// ── Nominee card ───────────────────────────────────────────────────────────

function NomineeCard({
  nominee,
  isSelected,
  isAiWinner,
  revealed,
  disabled,
  onSelect,
  colors,
}: {
  nominee: OscarNominee;
  isSelected: boolean;
  isAiWinner: boolean;
  revealed: boolean;
  disabled: boolean;
  onSelect: () => void;
  colors: typeof DEFAULT_COLORS;
}) {
  return (
    <motion.button
      onClick={() => { if (!disabled) onSelect(); }}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      className={clsx(
        'relative flex flex-col rounded-2xl border overflow-hidden text-left w-full transition-all duration-200',
        isSelected
          ? `border-white/50 ring-2 ${colors.ring} bg-white/[0.07]`
          : revealed && isAiWinner
            ? 'border-yellow-400/50 ring-1 ring-yellow-400/30 bg-white/[0.05]'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-white/5 overflow-hidden">
        {nominee.thumbnail ? (
          <img
            src={nominee.thumbnail}
            alt={nominee.gameName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 size={18} className="text-white/15" />
          </div>
        )}

        {/* Selected overlay (pre-reveal) */}
        {isSelected && !revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/10 flex items-center justify-center"
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
              <Check size={14} className="text-black" />
            </div>
          </motion.div>
        )}

        {/* Post-reveal badges */}
        {revealed && (
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
            {isAiWinner && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/90 rounded-full text-[10px] font-bold text-black leading-none"
              >
                <Trophy size={8} /> AI
              </motion.span>
            )}
            {isSelected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className="px-1.5 py-0.5 bg-white/90 rounded-full text-[10px] font-bold text-black leading-none"
              >
                You
              </motion.span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-0.5">
        <div className="text-xs font-bold text-white leading-snug line-clamp-2">
          {nominee.gameName}
        </div>
        {nominee.stat && (
          <div className="text-[11px] text-white/45 leading-snug">{nominee.stat}</div>
        )}
        {nominee.reason && nominee.reason !== nominee.stat && (
          <div className="text-[10px] text-white/30 leading-snug line-clamp-2">{nominee.reason}</div>
        )}
      </div>
    </motion.button>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

interface SingleAwardScreenProps {
  award: OscarAward;
  awardIndex: number;
  totalAwards: number;
  periodType: OscarPeriodType;
  periodKey: string;
  /** Template description shown immediately */
  templateBlurb: string;
  /** AI-generated description — replaces template when available */
  aiBlurb?: string;
  isLoadingAiBlurb?: boolean;
  /** Called after user taps "Collect & Continue" */
  onAdvance: () => void;
}

export function SingleAwardScreen({
  award,
  awardIndex,
  totalAwards,
  periodType,
  periodKey,
  templateBlurb,
  aiBlurb,
  isLoadingAiBlurb,
  onAdvance,
}: SingleAwardScreenProps) {
  const colors = CATEGORY_COLORS[award.category] ?? DEFAULT_COLORS;
  const allNominees: OscarNominee[] = [award.winner, ...award.nominees];

  const [userPickId, setUserPickId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [collected, setCollected] = useState(false);

  // Load any previously saved vote for this category
  useEffect(() => {
    const saved = getOscarVote(periodKey, award.category);
    if (saved) setUserPickId(saved.gameId);
  }, [periodKey, award.category]);

  const handlePick = (nominee: OscarNominee) => {
    if (revealed) return;
    setUserPickId(nominee.gameId);
    castOscarVote(periodKey, periodType, award.category, nominee.gameId, nominee.gameName);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleCollect = () => {
    if (collected) return;
    setCollected(true);
    setTimeout(() => onAdvance(), 380);
  };

  const userPick = userPickId ? allNominees.find(n => n.gameId === userPickId) : null;
  const userPickedWinner = userPickId === award.winner.gameId;
  // Show AI text once ready, fallback to template until then
  const activeBlurb = aiBlurb || templateBlurb;

  return (
    <div
      className="w-full max-w-lg mx-auto space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Award counter row */}
      <div className="flex items-center justify-between px-0.5">
        <div className={clsx('text-[10px] font-bold uppercase tracking-widest opacity-60', colors.accent)}>
          Award {awardIndex + 1} of {totalAwards}
        </div>
        <div className="text-[10px] text-white/25 uppercase tracking-widest">Oscar Ceremony</div>
      </div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={clsx(
          'p-5 rounded-2xl border bg-gradient-to-br',
          colors.gradient,
          colors.border,
        )}
      >
        <div className="text-4xl mb-2 leading-none">{award.icon}</div>
        <h2 className="text-xl font-bold text-white">{award.categoryLabel}</h2>
        <p className={clsx('text-sm italic mt-0.5 opacity-75', colors.accent)}>
          {award.tagline}
        </p>

        {/* Blurb: shimmer while loading, template then AI text */}
        <div className="mt-3 min-h-[2.5rem]">
          {isLoadingAiBlurb && !aiBlurb ? (
            <div className="space-y-1.5 pt-0.5">
              <div className="h-3 bg-white/10 rounded-full animate-pulse w-full" />
              <div className="h-3 bg-white/10 rounded-full animate-pulse w-4/5" />
              <div className="h-3 bg-white/10 rounded-full animate-pulse w-3/5" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={activeBlurb}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-white/55 leading-relaxed"
              >
                {activeBlurb}
              </motion.p>
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Nominees */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            The Nominees
          </span>
          <div className="flex-1 h-px bg-white/10" />
          {!revealed && !userPickId && (
            <span className="text-[10px] text-white/20">Tap to pick</span>
          )}
          {!revealed && userPickId && (
            <span className={clsx('text-[10px] font-semibold', colors.accent)}>
              ✓ Picked
            </span>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          {allNominees.map((nominee) => (
            <NomineeCard
              key={nominee.gameId}
              nominee={nominee}
              isSelected={userPickId === nominee.gameId}
              isAiWinner={nominee.gameId === award.winner.gameId}
              revealed={revealed}
              disabled={revealed}
              onSelect={() => handlePick(nominee)}
              colors={colors}
            />
          ))}
        </motion.div>
      </div>

      {/* ── Pre-reveal: Open Envelope button ── */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            <motion.button
              onClick={() => handleReveal()}
              whileTap={{ scale: 0.97 }}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-semibold transition-all',
                userPickId
                  ? 'bg-white/10 border-white/25 text-white hover:bg-white/15'
                  : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/70 hover:border-white/15',
              )}
            >
              <span>📨</span>
              {userPickId ? 'Open Envelope — lock in my pick' : 'Open Envelope — skip picking'}
            </motion.button>
            {!userPickId && (
              <p className="text-center text-[11px] text-white/20">
                Pick a nominee first, or open to skip
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Post-reveal: comparison + collect ── */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="space-y-3"
          >
            {/* You vs AI comparison */}
            <div className={clsx(
              'p-4 rounded-2xl border bg-gradient-to-br',
              colors.gradient,
              colors.border,
            )}>
              <div className="grid grid-cols-2 gap-4">
                {/* User's pick */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    You picked
                  </div>
                  {userPick ? (
                    <div className="flex items-center gap-2">
                      {userPick.thumbnail && (
                        <img
                          src={userPick.thumbnail}
                          alt={userPick.gameName}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      )}
                      <span className="text-xs font-bold text-white leading-tight line-clamp-2">
                        {userPick.gameName}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-white/25 italic">Skipped</div>
                  )}
                </div>

                {/* AI's pick */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    AI thought
                  </div>
                  <div className="flex items-center gap-2">
                    {award.winner.thumbnail && (
                      <img
                        src={award.winner.thumbnail}
                        alt={award.winner.gameName}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                        loading="lazy"
                      />
                    )}
                    <span className="text-xs font-bold text-yellow-300 leading-tight line-clamp-2">
                      {award.winner.gameName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <span className={clsx(
                  'text-xs font-bold',
                  userPickedWinner ? 'text-emerald-300' : userPick ? colors.accent : 'text-white/35',
                )}>
                  {userPickedWinner
                    ? '🤝 Great minds think alike'
                    : userPick
                      ? '✌️ You went your own way — your pick stands'
                      : "🤖 AI's call — you didn't weigh in"}
                </span>
              </div>
            </div>

            {/* Collect & Continue */}
            <motion.button
              onClick={() => handleCollect()}
              whileTap={{ scale: 0.97 }}
              disabled={collected}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all',
                collected
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-white text-black hover:bg-white/90',
              )}
            >
              {collected ? (
                <><Check size={16} /> Award Collected</>
              ) : (
                <>🏆 Collect Award — Continue →</>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
