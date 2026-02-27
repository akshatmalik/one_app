'use client';

import { motion } from 'framer-motion';
import { Clock, Gamepad2, BarChart3, Zap, DollarSign, Trophy, Target, Calendar } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

export function YearInNumbersScreen({ data }: Props) {
  const stats = [
    { label: 'Hours Played', value: `${data.totalHours.toFixed(0)}h`, icon: <Clock size={26} />, color: 'text-amber-400', bg: 'from-amber-500/25 to-amber-600/10' },
    { label: 'Sessions', value: `${data.totalSessions}`, icon: <Gamepad2 size={26} />, color: 'text-purple-400', bg: 'from-purple-500/25 to-purple-600/10' },
    { label: 'Games Played', value: `${data.uniqueGames}`, icon: <BarChart3 size={26} />, color: 'text-cyan-400', bg: 'from-cyan-500/25 to-cyan-600/10' },
    { label: 'Days Active', value: `${data.daysActive}`, icon: <Zap size={26} />, color: 'text-yellow-400', bg: 'from-yellow-500/25 to-yellow-600/10' },
    { label: 'Total Spent', value: `$${data.totalSpent.toFixed(0)}`, icon: <DollarSign size={26} />, color: 'text-emerald-400', bg: 'from-emerald-500/25 to-emerald-600/10' },
    { label: 'Completed', value: `${data.completedGames.length}`, icon: <Trophy size={26} />, color: 'text-orange-400', bg: 'from-orange-500/25 to-orange-600/10' },
    { label: 'Bought', value: `${data.gamesPurchased.length}`, icon: <Target size={26} />, color: 'text-blue-400', bg: 'from-blue-500/25 to-blue-600/10' },
    { label: 'Best Streak', value: `${data.longestStreak}d`, icon: <Calendar size={26} />, color: 'text-pink-400', bg: 'from-pink-500/25 to-pink-600/10' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center"
      >
        {data.year} in Numbers
      </motion.h2>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.5, type: 'spring' }}
            className={`p-4 bg-gradient-to-br ${stat.bg} rounded-2xl border border-white/5`}
          >
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.07 }}
              className={`text-3xl font-black ${stat.color}`}
            >
              {stat.value}
            </motion.div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {data.totalSaved > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-4 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center"
        >
          <span className="text-sm text-emerald-400">💰 You saved <strong>${data.totalSaved.toFixed(0)}</strong> on deals & subscriptions</span>
        </motion.div>
      )}
    </div>
  );
}
