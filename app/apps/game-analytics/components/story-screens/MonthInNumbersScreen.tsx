'use client';

import { motion } from 'framer-motion';
import { Clock, Gamepad2, BarChart3, Zap, DollarSign, Trophy } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthInNumbersScreenProps {
  data: MonthInReviewData;
}

export function MonthInNumbersScreen({ data }: MonthInNumbersScreenProps) {
  const stats = [
    { label: 'Hours Played', value: `${data.totalHours.toFixed(1)}h`, icon: <Clock size={22} />, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10' },
    { label: 'Sessions', value: `${data.totalSessions}`, icon: <Gamepad2 size={22} />, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10' },
    { label: 'Games', value: `${data.uniqueGames}`, icon: <BarChart3 size={22} />, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/10' },
    { label: 'Days Active', value: `${data.daysActive}`, icon: <Zap size={22} />, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-600/10' },
    { label: 'Spent', value: `$${data.totalSpent.toFixed(0)}`, icon: <DollarSign size={22} />, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10' },
    { label: 'Completed', value: `${data.completedGames.length}`, icon: <Trophy size={22} />, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/10' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8"
      >
        Month in Numbers
      </motion.h2>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5, type: 'spring' }}
            className={`p-5 bg-gradient-to-br ${stat.bg} rounded-2xl border border-white/5`}
          >
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
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
