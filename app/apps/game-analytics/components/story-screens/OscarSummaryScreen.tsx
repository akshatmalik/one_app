'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Gamepad2 } from 'lucide-react';
import { OscarAwardsData } from '../../lib/calculations';
import { getOscarVotesForPeriod } from '../../lib/oscar-storage';
import clsx from 'clsx';

interface OscarSummaryScreenProps {
  data: OscarAwardsData;
  periodKey: string;
  periodType: 'week' | 'month' | 'year';
}

export function OscarSummaryScreen({ data, periodKey, periodType }: OscarSummaryScreenProps) {
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    const votes = getOscarVotesForPeriod(periodKey);
    const picks: Record<string, string> = {};
    for (const v of votes) {
      picks[v.categoryId] = v.gameId;
    }
    setUserPicks(picks);
  }, [periodKey]);

  const periodLabel = periodType === 'week' ? 'Week' : periodType === 'month' ? 'Month' : 'Year';

  // Count how many times user agreed with AI
  const agreedCount = data.awards.filter(a => {
    const pick = userPicks[a.category];
    return pick && pick === a.winner.gameId;
  }).length;

  const pickedCount = data.awards.filter(a => !!userPicks[a.category]).length;

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <div className="text-4xl">🏆</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/70">
          Oscar Ceremony
        </div>
        <h2 className="text-2xl font-bold text-white">The Final Tally</h2>
        <p className="text-xs text-white/35">{data.periodLabel}</p>
      </motion.div>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-center gap-6 py-3 px-5 rounded-2xl bg-white/[0.04] border border-white/10"
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-300">{agreedCount}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide">Agreed with AI</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold text-white/70">{pickedCount - agreedCount}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide">Went own way</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold text-white/30">{data.awards.length - pickedCount}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide">Skipped</div>
        </div>
      </motion.div>

      {/* Award rows */}
      <div className="space-y-2.5">
        {data.awards.map((award, i) => {
          const userPickId = userPicks[award.category];
          const allNominees = [award.winner, ...award.nominees];
          const userPick = userPickId ? allNominees.find(n => n.gameId === userPickId) : null;
          const agreed = userPickId === award.winner.gameId;
          const skipped = !userPickId;

          return (
            <motion.div
              key={award.category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 220 }}
              className="p-3 rounded-xl border border-white/10 bg-white/[0.03]"
            >
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{award.icon}</span>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex-1">
                  {award.categoryLabel}
                </div>
                {!skipped && (
                  <div className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                    agreed ? 'bg-emerald-500/20' : 'bg-white/10',
                  )}>
                    {agreed
                      ? <Check size={11} className="text-emerald-300" />
                      : <X size={11} className="text-white/30" />
                    }
                  </div>
                )}
              </div>

              {/* You vs AI */}
              <div className="grid grid-cols-2 gap-2">
                {/* User pick */}
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 w-5 shrink-0">
                    You
                  </div>
                  {userPick ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      {userPick.thumbnail ? (
                        <img
                          src={userPick.thumbnail}
                          alt={userPick.gameName}
                          className="w-6 h-6 rounded object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-white/5 shrink-0 flex items-center justify-center">
                          <Gamepad2 size={10} className="text-white/20" />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-white truncate">
                        {userPick.gameName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/20 italic">—</span>
                  )}
                </div>

                {/* AI pick */}
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-yellow-400/50 w-4 shrink-0">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {award.winner.thumbnail ? (
                      <img
                        src={award.winner.thumbnail}
                        alt={award.winner.gameName}
                        className="w-6 h-6 rounded object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-white/5 shrink-0 flex items-center justify-center">
                        <Gamepad2 size={10} className="text-white/20" />
                      </div>
                    )}
                    <span className="text-xs font-semibold text-yellow-300/80 truncate">
                      {award.winner.gameName}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Closing note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/25 pb-2"
      >
        {agreedCount === data.awards.length && pickedCount === data.awards.length
          ? 'Perfect sync with the data. Impressive.'
          : agreedCount === 0 && pickedCount > 0
            ? 'Full independent thinker. The data respectfully disagrees.'
            : `Your ${periodLabel.toLowerCase()} in ${data.awards.length} chapters.`}
      </motion.p>
    </div>
  );
}
