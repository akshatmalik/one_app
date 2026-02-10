'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { MonthInReviewData, parseLocalDate } from '../../lib/calculations';

interface MonthBiggestDayScreenProps {
  data: MonthInReviewData;
}

export function MonthBiggestDayScreen({ data }: MonthBiggestDayScreenProps) {
  if (!data.biggestDay) return null;
  const date = parseLocalDate(data.biggestDay.date);
  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-4"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center mx-auto">
          <Flame size={40} className="text-orange-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-orange-400/60 mb-2"
      >
        Peak Gaming Day
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-white/60 mb-6"
      >
        {dayLabel}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-4"
      >
        {data.biggestDay.hours.toFixed(1)}h
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-1"
      >
        {data.biggestDay.games.map((game, i) => (
          <motion.div
            key={game}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="text-sm text-white/50"
          >
            {game}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
