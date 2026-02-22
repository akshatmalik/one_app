'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Trophy, ThumbsUp, Gamepad2, ChevronRight, Check } from 'lucide-react';
import { OscarAward, OscarAwardsData, OscarNominee } from '../../lib/calculations';
import {
  castOscarVote, getOscarVotesForPeriod, OscarPeriodType,
  weekPeriodKey, monthPeriodKey, yearPeriodKey,
} from '../../lib/oscar-storage';
import { Game } from '../../lib/types';
import clsx from 'clsx';

interface OscarAwardsScreenProps {
  data: OscarAwardsData;
  allPlayedGames: Game[];                           // all games played in the period
  periodType: OscarPeriodType;
  periodYear: number;
  periodMonth?: number;                              // only for 'month'
  /** Optional: pre-computed period key override */
  periodKeyOverride?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  best_picture: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  best_supporting: 'from-slate-500/20 to-gray-500/20 border-slate-400/30',
  best_short_film: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  biggest_plot_twist: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
  lifetime_achievement: 'from-orange-500/20 to-amber-500/20 border-orange-400/30',
  best_comeback: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
  worst_bang_for_buck: 'from-red-500/20 to-rose-500/20 border-red-500/30',
  sleeper_hit: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
  most_likely_abandoned: 'from-orange-600/20 to-red-600/20 border-orange-500/30',
  iron_man: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  user_choice: 'from-pink-500/20 to-fuchsia-500/20 border-pink-500/30',
};

function NomineeCard({
  nominee,
  isWinner,
  isUserPick,
  onVote,
  revealMode,
}: {
  nominee: OscarNominee;
  isWinner: boolean;
  isUserPick: boolean;
  onVote: (nominee: OscarNominee) => void;
  revealMode: boolean;
}) {
  return (
    <motion.button
      onClick={() => !revealMode && onVote(nominee)}
      whileTap={!revealMode ? { scale: 0.97 } : {}}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
        isUserPick
          ? 'bg-pink-500/15 border-pink-500/40 ring-1 ring-pink-500/30'
          : isWinner && revealMode
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-white/[0.03] border-white/10 hover:border-white/20',
      )}
    >
      {nominee.thumbnail ? (
        <img src={nominee.thumbnail} alt={nominee.gameName} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
          <Gamepad2 size={14} className="text-white/20" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{nominee.gameName}</div>
        {nominee.stat && <div className="text-xs text-white/40">{nominee.stat}</div>}
      </div>

      {/* Status indicators */}
      <div className="shrink-0 flex items-center gap-1.5">
        {isUserPick && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-pink-500/20 rounded-md text-[10px] text-pink-300 font-bold">
            <ThumbsUp size={9} /> Your pick
          </span>
        )}
        {isWinner && revealMode && !isUserPick && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 rounded-md text-[10px] text-yellow-300 font-bold">
            <Trophy size={9} /> Winner
          </span>
        )}
        {isWinner && revealMode && isUserPick && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 rounded-md text-[10px] text-emerald-300 font-bold">
            <Check size={9} /> Correct!
          </span>
        )}
        {!revealMode && !isUserPick && (
          <ChevronRight size={14} className="text-white/20" />
        )}
      </div>
    </motion.button>
  );
}

function EnvelopeReveal({ award, userPickId, revealed, onReveal }: {
  award: OscarAward;
  userPickId?: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  const userWasRight = userPickId === award.winner.gameId;
  const colorClass = CATEGORY_COLORS[award.category] ?? 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
  const allNominees = [award.winner, ...award.nominees].slice(0, 3);

  return (
    <div className={`p-4 bg-gradient-to-br ${colorClass} rounded-2xl border`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{award.icon}</span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{award.categoryLabel}</div>
          <div className="text-xs text-white/25 italic">{award.tagline}</div>
        </div>
      </div>

      {/* Nominees (pre-reveal: vote; post-reveal: show winner) */}
      <div className="space-y-2 mb-3">
        {allNominees.map(nominee => (
          <NomineeCard
            key={nominee.gameId}
            nominee={nominee}
            isWinner={nominee.gameId === award.winner.gameId}
            isUserPick={nominee.gameId === userPickId}
            onVote={() => {}} // voting handled at screen level
            revealMode={revealed}
          />
        ))}
      </div>

      {/* Reveal button */}
      {!revealed && (
        <motion.button
          onClick={onReveal}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all"
          whileTap={{ scale: 0.97 }}
        >
          <span>📨</span> Open Envelope
        </motion.button>
      )}

      {/* Post-reveal result */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            'text-center text-xs font-bold py-2 rounded-xl',
            userWasRight
              ? 'text-emerald-300 bg-emerald-500/10'
              : userPickId
                ? 'text-white/40 bg-white/5'
                : 'text-yellow-300 bg-yellow-500/10',
          )}
        >
          {userWasRight
            ? '🎉 You called it!'
            : userPickId
              ? `Data says: ${award.winner.gameName}`
              : `Winner: ${award.winner.gameName}`}
        </motion.div>
      )}
    </div>
  );
}

export function OscarAwardsScreen({
  data,
  allPlayedGames,
  periodType,
  periodYear,
  periodMonth,
  periodKeyOverride,
}: OscarAwardsScreenProps) {
  const periodKey = periodKeyOverride ?? (
    periodType === 'week'
      ? weekPeriodKey()
      : periodType === 'month' && periodMonth != null
        ? monthPeriodKey(periodYear, periodMonth)
        : yearPeriodKey(periodYear)
  );

  // Track per-category user picks + which envelopes are revealed
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  // User Choice: which game does the user say was their personal favourite?
  const [userChoiceId, setUserChoiceId] = useState<string | null>(null);
  const [showUserChoice, setShowUserChoice] = useState(false);

  // Load saved votes on mount
  useEffect(() => {
    const saved = getOscarVotesForPeriod(periodKey);
    const picks: Record<string, string> = {};
    for (const v of saved) {
      picks[v.categoryId] = v.gameId;
      if (v.categoryId === 'user_choice') setUserChoiceId(v.gameId);
    }
    setUserPicks(picks);
  }, [periodKey]);

  const castVote = useCallback((categoryId: string, gameId: string, gameName: string) => {
    setUserPicks(prev => ({ ...prev, [categoryId]: gameId }));
    castOscarVote(periodKey, periodType, categoryId, gameId, gameName);
  }, [periodKey, periodType]);

  const revealEnvelope = useCallback((categoryId: string) => {
    setRevealed(prev => new Set(prev).add(categoryId));
  }, []);

  if (data.awards.length === 0) return null;

  return (
    <div className="w-full max-w-lg mx-auto px-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full mb-3 border border-yellow-500/20">
          <Award size={14} className="text-yellow-300" />
          <span className="text-yellow-200 font-bold text-xs uppercase tracking-widest">The {periodType === 'week' ? 'Week' : periodType === 'month' ? 'Month' : 'Year'} Awards</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Oscar Ceremony</h2>
        <p className="text-xs text-white/30 mt-1">{data.periodLabel} · Pick nominees before revealing</p>
      </motion.div>

      {/* Category awards */}
      {data.awards.map((award, i) => (
        <motion.div
          key={award.category}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 200 }}
        >
          {/* Show nominees with tap-to-pick before reveal, then show winner after */}
          <div className={`p-4 bg-gradient-to-br ${CATEGORY_COLORS[award.category] ?? 'from-purple-500/20 to-violet-500/20 border-purple-500/30'} rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{award.icon}</span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{award.categoryLabel}</div>
                <div className="text-xs text-white/25 italic">{award.tagline}</div>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {[award.winner, ...award.nominees].slice(0, 3).map(nominee => (
                <NomineeCard
                  key={nominee.gameId}
                  nominee={nominee}
                  isWinner={nominee.gameId === award.winner.gameId}
                  isUserPick={userPicks[award.category] === nominee.gameId}
                  onVote={n => castVote(award.category, n.gameId, n.gameName)}
                  revealMode={revealed.has(award.category)}
                />
              ))}
            </div>

            {!revealed.has(award.category) ? (
              <motion.button
                onClick={() => revealEnvelope(award.category)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all"
                whileTap={{ scale: 0.97 }}
              >
                <span>📨</span>
                {userPicks[award.category] ? 'Reveal — lock in my pick' : 'Reveal winner'}
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  'text-center text-xs font-bold py-2 rounded-xl',
                  userPicks[award.category] === award.winner.gameId
                    ? 'text-emerald-300 bg-emerald-500/10'
                    : userPicks[award.category]
                      ? 'text-white/40 bg-white/5'
                      : 'text-yellow-300 bg-yellow-500/10',
                )}
              >
                {userPicks[award.category] === award.winner.gameId
                  ? '🎉 You called it!'
                  : userPicks[award.category]
                    ? `Data says: ${award.winner.gameName}`
                    : `🏆 ${award.winner.gameName}`}
              </motion.div>
            )}
          </div>
        </motion.div>
      ))}

      {/* ── USER'S CHOICE ─ personal favourite for the period ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-2xl border border-pink-500/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏅</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink-300/60">Your Personal Pick</div>
            <div className="text-xs text-white/25 italic">Which game deserves the crown this {periodType}?</div>
          </div>
        </div>

        {!showUserChoice && !userChoiceId && (
          <button
            onClick={() => setShowUserChoice(true)}
            className="w-full py-2.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl text-sm text-pink-300 transition-all font-medium"
          >
            Cast my vote →
          </button>
        )}

        {(showUserChoice || userChoiceId) && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {allPlayedGames.map(game => (
              <button
                key={game.id}
                onClick={() => {
                  setUserChoiceId(game.id);
                  castVote('user_choice', game.id, game.name);
                  setShowUserChoice(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all',
                  userChoiceId === game.id
                    ? 'bg-pink-500/20 border-pink-500/40 text-white'
                    : 'bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:border-white/15',
                )}
              >
                {game.thumbnail && (
                  <img src={game.thumbnail} alt={game.name} className="w-7 h-7 rounded-lg object-cover shrink-0" loading="lazy" />
                )}
                <span className="text-sm font-medium truncate flex-1">{game.name}</span>
                {userChoiceId === game.id && (
                  <Check size={14} className="text-pink-300 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {userChoiceId && !showUserChoice && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {allPlayedGames.find(g => g.id === userChoiceId)?.thumbnail && (
                <img
                  src={allPlayedGames.find(g => g.id === userChoiceId)!.thumbnail}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <span className="text-sm font-bold text-white">
                {allPlayedGames.find(g => g.id === userChoiceId)?.name ?? 'Your pick'}
              </span>
            </div>
            <button
              onClick={() => setShowUserChoice(true)}
              className="text-[10px] text-white/30 hover:text-white/60 underline"
            >
              Change
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
