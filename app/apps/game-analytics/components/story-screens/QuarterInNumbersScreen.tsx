'use client';

import { motion } from 'framer-motion';
import { Clock, Gamepad2, BarChart3, Zap, DollarSign, Trophy, XCircle, Star } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterInNumbersScreen({ data }: Props) {
  const stats = [
    { label: 'Hours Played', value: `${data.totalHours.toFixed(1)}h`, icon: <Clock size={24} />, color: 'text-blue-400', bg: 'from-blue-500/25 to-blue-600/10', delay: 0.1 },
    { label: 'Sessions', value: `${data.totalSessions}`, icon: <Gamepad2 size={24} />, color: 'text-purple-400', bg: 'from-purple-500/25 to-purple-600/10', delay: 0.2 },
    { label: 'Games Played', value: `${data.uniqueGames}`, icon: <BarChart3 size={24} />, color: 'text-cyan-400', bg: 'from-cyan-500/25 to-cyan-600/10', delay: 0.3 },
    { label: 'Days Active', value: `${data.daysActive}`, icon: <Zap size={24} />, color: 'text-yellow-400', bg: 'from-yellow-500/25 to-yellow-600/10', delay: 0.4 },
    { label: 'Total Spent', value: `$${data.totalSpent.toFixed(0)}`, icon: <DollarSign size={24} />, color: 'text-emerald-400', bg: 'from-emerald-500/25 to-emerald-600/10', delay: 0.5 },
    { label: 'Completed', value: `${data.completedGames.length}`, icon: <Trophy size={24} />, color: 'text-orange-400', bg: 'from-orange-500/25 to-orange-600/10', delay: 0.6 },
    { label: 'Abandoned', value: `${data.abandonedGames.length}`, icon: <XCircle size={24} />, color: 'text-red-400', bg: 'from-red-500/25 to-red-600/10', delay: 0.7 },
    { label: 'Avg Session', value: `${data.avgSessionLength.toFixed(1)}h`, icon: <Star size={24} />, color: 'text-pink-400', bg: 'from-pink-500/25 to-pink-600/10', delay: 0.8 },
  ];

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center"
      >
        {data.quarterLabel} in Numbers
      </motion.h2>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.5, type: 'spring' }}
            className={`p-4 bg-gradient-to-br ${stat.bg} rounded-2xl border border-white/5`}
          >
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stat.delay + 0.3 }}
              className={`text-3xl font-black ${stat.color}`}
            >
              {stat.value}
            </motion.div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
