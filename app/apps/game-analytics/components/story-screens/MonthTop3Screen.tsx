'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthTop3ScreenProps {
  data: MonthInReviewData;
}

export function MonthTop3Screen({ data }: MonthTop3ScreenProps) {
  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
  const bgColors = ['from-yellow-500/10 to-yellow-600/5', 'from-gray-400/10 to-gray-500/5', 'from-amber-600/10 to-amber-700/5'];

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8"
      >
        Podium
      </motion.div>

      <div className="space-y-4">
        {data.top3Games.map((g, i) => (
          <motion.div
            key={g.game.id}
            initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.2, duration: 0.5, type: 'spring' }}
            className={`flex items-center gap-4 p-4 bg-gradient-to-r ${bgColors[i]} rounded-2xl border border-white/5`}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
              className="text-4xl"
            >
              {medals[i]}
            </motion.span>

            {g.game.thumbnail && (
              <img src={g.game.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover" />
            )}

            <div className="flex-1 text-left">
              <div className="text-white font-semibold text-lg">{g.game.name}</div>
              <div className="text-xs text-white/40">{g.game.genre || 'Unknown'}</div>
            </div>

            <div className="text-right">
              <div className={`text-xl font-bold ${colors[i]}`}>{g.hours.toFixed(1)}h</div>
              <div className="text-xs text-white/30">{g.percentage.toFixed(0)}%</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
