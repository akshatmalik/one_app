'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthUnfinishedScreenProps {
  data: MonthInReviewData;
}

export function MonthUnfinishedScreen({ data }: MonthUnfinishedScreenProps) {
  const games = data.unfinishedGames.slice(0, 5);

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2"
      >
        Unfinished Business
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-white/30 mb-8"
      >
        Still in progress — carry these into next month
      </motion.p>

      <div className="space-y-3">
        {games.map((g, i) => (
          <motion.div
            key={g.game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
            className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/5"
          >
            {g.game.thumbnail && <img src={g.game.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />}
            <div className="flex-1 text-left">
              <div className="text-white font-semibold">{g.game.name}</div>
              <div className="text-xs text-white/30">{g.game.genre || 'Unknown'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-purple-400">{g.hoursThisMonth.toFixed(1)}h</div>
              <div className="text-[10px] text-white/30">this month</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 flex items-center justify-center gap-2 text-sm text-purple-400/60"
      >
        <span>To be continued</span>
        <ArrowRight size={14} />
      </motion.div>
    </div>
  );
}
