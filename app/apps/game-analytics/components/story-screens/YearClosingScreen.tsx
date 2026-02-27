'use client';

import { motion } from 'framer-motion';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; yearTitle?: string; }

export function YearClosingScreen({ data, yearTitle }: Props) {
  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="text-7xl mb-6">
          🌟
        </motion.div>

        {/* Year badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6"
        >
          <span
            className="text-4xl font-black text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
          >
            {data.year}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-white/40 text-sm">Sealed</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4"
        >
          That&apos;s your year.
        </motion.h2>

        {yearTitle && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="text-base text-amber-300 italic mb-6">
            &ldquo;{yearTitle}&rdquo;
          </motion.p>
        )}

        {/* Memorial stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-3xl font-black text-amber-400">{data.totalHours.toFixed(0)}h</div>
            <div className="text-xs text-white/30 mt-1">hours lived</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-3xl font-black text-purple-400">{data.uniqueGames}</div>
            <div className="text-xs text-white/30 mt-1">games</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-3xl font-black text-orange-400">{data.completedGames.length}</div>
            <div className="text-xs text-white/30 mt-1">completed</div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-sm text-white/30 mb-2"
        >
          {data.year + 1} is yours. ✌️
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="text-xs text-white/15"
        >
          ${(data.totalHours > 0 && data.totalSpent > 0 ? data.totalSpent / data.totalHours : 0).toFixed(2)}/hr · {data.totalSessions} sessions · {data.daysActive} active days
        </motion.p>
      </motion.div>
    </div>
  );
}
