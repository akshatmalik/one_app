'use client';

import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthTitleScreenProps {
  data: MonthInReviewData;
  monthTitle?: string;
}

export function MonthTitleScreen({ data, monthTitle }: MonthTitleScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      {/* Month badge */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mb-8 border border-purple-500/30"
      >
        <Calendar size={20} className="text-purple-300" />
        <span className="text-purple-200 font-medium">{data.monthLabel}</span>
      </motion.div>

      {/* Big title */}
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-4"
      >
        Monthly Recap
      </motion.h1>

      {/* AI title */}
      {monthTitle && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5, type: 'spring' }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-500/10 backdrop-blur-sm rounded-full border border-cyan-500/20">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300 italic">{monthTitle}</span>
          </div>
        </motion.div>
      )}

      {/* Subtitle stats */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-lg text-white/50"
      >
        {data.totalHours.toFixed(1)}h across {data.uniqueGames} game{data.uniqueGames !== 1 ? 's' : ''} in {data.daysActive} days
      </motion.p>
    </div>
  );
}
