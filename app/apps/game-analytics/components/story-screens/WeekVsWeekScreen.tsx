'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface WeekVsWeekScreenProps {
  data: WeekInReviewData;
}

export function WeekVsWeekScreen({ data }: WeekVsWeekScreenProps) {
  const { totalHours, uniqueGames, totalSessions, longestStreak, vsLastWeek } = data;

  const stats = [
    {
      label: 'Hours',
      thisWeek: totalHours,
      lastWeek: totalHours - vsLastWeek.hoursDiff,
      format: (v: number) => `${v.toFixed(1)}h`,
      diff: vsLastWeek.hoursDiff,
    },
    {
      label: 'Games',
      thisWeek: uniqueGames,
      lastWeek: uniqueGames - (vsLastWeek.gamesDiff || 0),
      format: (v: number) => `${Math.max(0, Math.round(v))}`,
      diff: vsLastWeek.gamesDiff || 0,
    },
    {
      label: 'Sessions',
      thisWeek: totalSessions,
      lastWeek: totalSessions - (vsLastWeek.sessionsDiff || 0),
      format: (v: number) => `${Math.max(0, Math.round(v))}`,
      diff: vsLastWeek.sessionsDiff || 0,
    },
    {
      label: 'Streak',
      thisWeek: longestStreak,
      lastWeek: Math.max(0, longestStreak - 1),
      format: (v: number) => `${Math.round(v)}d`,
      diff: longestStreak > 0 ? 1 : 0,
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Scoreboard</span>
        <h2 className="text-2xl font-bold text-white mt-2">This Week vs Last Week</h2>
      </motion.div>

      {/* Stats comparison */}
      <div className="space-y-4">
        {stats.map((stat, i) => {
          const isUp = stat.diff > 0;
          const isDown = stat.diff < 0;
          const isSame = stat.diff === 0;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5"
            >
              {/* This week */}
              <div className="flex-1 text-right">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
                  className="text-2xl font-bold text-white"
                >
                  {stat.format(stat.thisWeek)}
                </motion.span>
              </div>

              {/* Center label + arrow */}
              <div className="w-24 flex flex-col items-center gap-1">
                <span className="text-xs text-white/40 font-medium">{stat.label}</span>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.15, duration: 0.3, type: 'spring' }}
                >
                  {isUp && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">+{stat.diff > 0 ? stat.format(stat.diff) : Math.abs(stat.diff)}</span>
                    </div>
                  )}
                  {isDown && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full">
                      <TrendingDown size={12} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400">{stat.format(stat.diff)}</span>
                    </div>
                  )}
                  {isSame && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full">
                      <Minus size={12} className="text-white/40" />
                      <span className="text-xs font-bold text-white/40">same</span>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Last week */}
              <div className="flex-1 text-left">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
                  className="text-2xl font-bold text-white/40"
                >
                  {stat.format(Math.max(0, stat.lastWeek))}
                </motion.span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Column labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="flex justify-between mt-4 px-4 text-xs text-white/30"
      >
        <span>This Week</span>
        <span>Last Week</span>
      </motion.div>
    </div>
  );
}
