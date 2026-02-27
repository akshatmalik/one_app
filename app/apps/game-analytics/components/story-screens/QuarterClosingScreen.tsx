'use client';

import { motion } from 'framer-motion';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; quarterTitle?: string; }

export function QuarterClosingScreen({ data, quarterTitle }: Props) {
  const nextQ = data.quarter === 4 ? `Q1 ${data.year + 1}` : `Q${data.quarter + 1} ${data.year}`;

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
          className="text-7xl mb-8"
        >
          🎮
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6"
        >
          <span className="text-purple-300 font-bold">{data.quarterLabel}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/40 text-sm">{data.dateRange}</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4"
        >
          Chapter Closed
        </motion.h2>

        {quarterTitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-purple-300 italic mb-6"
          >
            &ldquo;{quarterTitle}&rdquo;
          </motion.p>
        )}

        {/* Final stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-8 mb-8"
        >
          <div>
            <div className="text-3xl font-black text-purple-400">{data.totalHours.toFixed(1)}h</div>
            <div className="text-xs text-white/30">played</div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-400">{data.uniqueGames}</div>
            <div className="text-xs text-white/30">games</div>
          </div>
          <div>
            <div className="text-3xl font-black text-orange-400">{data.completedGames.length}</div>
            <div className="text-xs text-white/30">completed</div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-white/40"
        >
          {nextQ} is waiting ✌️
        </motion.p>
      </motion.div>
    </div>
  );
}
