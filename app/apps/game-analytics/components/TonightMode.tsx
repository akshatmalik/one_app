'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Clock, Gamepad2, ChevronRight, RotateCcw, Play, Zap, Sparkles, Moon, Swords, Shuffle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game, PlayLog } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getTonightPicks, TonightVibe, TonightPick, getRelationshipStatus, getTotalHours } from '../lib/calculations';
import clsx from 'clsx';

interface TonightModeProps {
  games: GameWithMetrics[];
  onClose: () => void;
  onLogTime: (game: GameWithMetrics) => void;
}

const TIME_OPTIONS: { label: string; sub: string; minutes: number; icon: string }[] = [
  { label: '~1 hour',    sub: 'Quick session',     minutes: 60,  icon: '⚡' },
  { label: '~2 hours',   sub: 'Solid evening',     minutes: 120, icon: '🌙' },
  { label: '3-4 hours',  sub: 'Deep dive',          minutes: 210, icon: '🔥' },
  { label: '4 hours +',  sub: 'All in tonight',     minutes: 300, icon: '🌌' },
];

const VIBE_OPTIONS: {
  id: TonightVibe;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: 'continue',
    label: 'Continue',
    sub: 'Pick up where I left off',
    icon: <Play size={18} />,
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/50',
  },
  {
    id: 'start_fresh',
    label: 'Start Fresh',
    sub: 'Begin something new',
    icon: <Sparkles size={18} />,
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/50',
  },
  {
    id: 'chill',
    label: 'Chill',
    sub: 'Low-key, relaxed vibe',
    icon: <Moon size={18} />,
    color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-400/50',
  },
  {
    id: 'challenge',
    label: 'Challenge',
    sub: 'Something intense',
    icon: <Swords size={18} />,
    color: 'from-orange-500/20 to-red-600/10 border-orange-500/30 hover:border-orange-400/50',
  },
  {
    id: 'surprise',
    label: 'Surprise Me',
    sub: 'I\'m feeling adventurous',
    icon: <Shuffle size={18} />,
    color: 'from-purple-500/20 to-fuchsia-600/10 border-purple-500/30 hover:border-purple-400/50',
  },
];

type Step = 'time' | 'vibe' | 'picks';

const TIME_MATCH_CONFIG = {
  perfect: { label: 'Perfect fit',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  close:   { label: 'Close match',     color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20'  },
  stretch: { label: 'Longer than usual', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  unknown: { label: 'New territory',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'     },
};

function PickCard({
  pick,
  rank,
  onLogTime,
  onClose,
}: {
  pick: TonightPick;
  rank: number;
  onLogTime: () => void;
  onClose: () => void;
}) {
  const rel = getRelationshipStatus(pick.game, []);
  const timeMatchCfg = TIME_MATCH_CONFIG[pick.timeMatch];
  const totalHrs = getTotalHours(pick.game);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.02]"
    >
      {/* Rank badge */}
      <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <span className="text-[10px] font-black text-white/60">#{rank + 1}</span>
      </div>

      {/* Thumbnail strip */}
      <div className="relative h-28 overflow-hidden">
        {pick.game.thumbnail ? (
          <img
            src={pick.game.thumbnail}
            alt={pick.game.name}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.65) saturate(1.1)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-slate-900/40 flex items-center justify-center">
            <Gamepad2 size={32} className="text-white/15" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d18] via-[#0d0d18]/40 to-transparent" />
        {/* Game name over image */}
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-base font-bold text-white leading-tight truncate">{pick.game.name}</p>
          {rel && (
            <p className="text-[10px] mt-0.5" style={{ color: rel.color }}>
              {rel.label}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Headline */}
        <p className="text-xs text-white/60 leading-relaxed">{pick.headline}</p>

        {/* Chips row */}
        <div className="flex flex-wrap gap-1.5">
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-medium', timeMatchCfg.bg, timeMatchCfg.color)}>
            {timeMatchCfg.label}
          </span>
          {pick.avgSessionHours > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/40 bg-white/[0.03]">
              avg {pick.avgSessionHours.toFixed(1)}h/session
            </span>
          )}
          {totalHrs > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/40 bg-white/[0.03]">
              {totalHrs.toFixed(0)}h total
            </span>
          )}
          {pick.game.status !== 'Not Started' && (
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full border font-medium',
              pick.game.status === 'In Progress'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-white/5 border-white/10 text-white/40',
            )}>
              {pick.game.status}
            </span>
          )}
        </div>

        {/* Action */}
        <button
          onClick={() => { onLogTime(); onClose(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-semibold transition-colors"
        >
          <Zap size={14} />
          Log a session
        </button>
      </div>
    </motion.div>
  );
}

export function TonightMode({ games, onClose, onLogTime }: TonightModeProps) {
  const [step, setStep] = useState<Step>('time');
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<TonightVibe | null>(null);
  const [picks, setPicks] = useState<TonightPick[]>([]);
  const [rerollKey, setRerollKey] = useState(0);

  // Compute picks whenever inputs are ready
  useEffect(() => {
    if (step === 'picks' && selectedMinutes !== null && selectedVibe !== null) {
      const result = getTonightPicks(games, selectedMinutes, selectedVibe);
      setPicks(result);
    }
  }, [step, selectedMinutes, selectedVibe, games, rerollKey]);

  const handleSelectTime = (minutes: number) => {
    setSelectedMinutes(minutes);
    setStep('vibe');
  };

  const handleSelectVibe = (vibe: TonightVibe) => {
    setSelectedVibe(vibe);
    setStep('picks');
  };

  const handleReroll = () => {
    setRerollKey(k => k + 1);
  };

  const handleBack = () => {
    if (step === 'vibe') setStep('time');
    else if (step === 'picks') setStep('vibe');
  };

  const stepIndex = step === 'time' ? 0 : step === 'vibe' ? 1 : 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md mx-0 sm:mx-4 bg-[#0d0d18] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎮</span>
            <div>
              <h2 className="text-base font-bold text-white/90">Play Tonight?</h2>
              <p className="text-[11px] text-white/35">
                {step === 'time' && 'How long can you play?'}
                {step === 'vibe' && "What's your vibe tonight?"}
                {step === 'picks' && 'Your top picks'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-5 pb-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={clsx(
                'h-1 rounded-full transition-all duration-300',
                i <= stepIndex ? 'bg-purple-500' : 'bg-white/10',
                i === stepIndex ? 'w-6' : 'w-2',
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: Time ──────────────────────────────────────────────────── */}
            {step === 'time' && (
              <motion.div
                key="time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-2 gap-3"
              >
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.minutes}
                    onClick={() => handleSelectTime(opt.minutes)}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border transition-all',
                      'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20',
                      selectedMinutes === opt.minutes && 'bg-purple-500/15 border-purple-500/40',
                    )}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-sm font-semibold text-white/90">{opt.label}</span>
                    <span className="text-[10px] text-white/40">{opt.sub}</span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* ── STEP 2: Vibe ──────────────────────────────────────────────────── */}
            {step === 'vibe' && (
              <motion.div
                key="vibe"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-2.5"
              >
                {VIBE_OPTIONS.map(vibe => (
                  <button
                    key={vibe.id}
                    onClick={() => handleSelectVibe(vibe.id)}
                    className={clsx(
                      'flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all text-left',
                      `bg-gradient-to-r ${vibe.color}`,
                    )}
                  >
                    <div className="text-white/60">{vibe.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">{vibe.label}</p>
                      <p className="text-[10px] text-white/45">{vibe.sub}</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-white/25" />
                  </button>
                ))}

                <button
                  onClick={handleBack}
                  className="mt-1 text-[11px] text-white/30 hover:text-white/60 transition-colors text-center py-1"
                >
                  ← Change time
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: Picks ──────────────────────────────────────────────────── */}
            {step === 'picks' && (
              <motion.div
                key="picks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                {picks.length === 0 ? (
                  <div className="text-center py-10">
                    <Gamepad2 size={32} className="mx-auto mb-3 text-white/15" />
                    <p className="text-sm text-white/40">No picks found for this vibe.</p>
                    <p className="text-[11px] text-white/25 mt-1">Try a different time or vibe.</p>
                    <button
                      onClick={() => setStep('vibe')}
                      className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                ) : (
                  <>
                    {picks.map((pick, i) => (
                      <PickCard
                        key={`${pick.game.id}-${rerollKey}`}
                        pick={pick}
                        rank={i}
                        onLogTime={() => {
                          const withMetrics = games.find(g => g.id === pick.game.id);
                          if (withMetrics) onLogTime(withMetrics);
                        }}
                        onClose={onClose}
                      />
                    ))}

                    {/* Re-roll + Back row */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleBack}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs font-medium hover:bg-white/5 transition-colors"
                      >
                        ← Change vibe
                      </button>
                      <button
                        onClick={handleReroll}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-medium hover:bg-purple-500/10 transition-colors"
                      >
                        <RotateCcw size={13} />
                        Re-roll
                      </button>
                    </div>

                    {/* Context line */}
                    <p className="text-[10px] text-white/20 text-center">
                      {picks.length} game{picks.length !== 1 ? 's' : ''} ranked for your{' '}
                      {TIME_OPTIONS.find(t => t.minutes === selectedMinutes)?.label.toLowerCase()} ·{' '}
                      {VIBE_OPTIONS.find(v => v.id === selectedVibe)?.label.toLowerCase()} session
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
