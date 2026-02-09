'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthClosingScreenProps {
  data: MonthInReviewData;
  monthTitle?: string;
}

export function MonthClosingScreen({ data, monthTitle }: MonthClosingScreenProps) {
  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-6xl mb-6"
        >
          🎮
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4"
        >
          That&apos;s a wrap!
        </motion.h2>

        {monthTitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-cyan-400 italic mb-6"
          >
            {monthTitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-8 mb-8"
        >
          <div>
            <div className="text-3xl font-black text-purple-400">{data.totalHours.toFixed(1)}h</div>
            <div className="text-xs text-white/40">played</div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-400">{data.uniqueGames}</div>
            <div className="text-xs text-white/40">games</div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-400">{data.totalSessions}</div>
            <div className="text-xs text-white/40">sessions</div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-white/40"
        >
          See you next month ✌️
        </motion.p>
      </motion.div>
    </div>
  );
}
