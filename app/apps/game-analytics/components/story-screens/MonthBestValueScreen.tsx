'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthBestValueScreenProps {
  data: MonthInReviewData;
}

export function MonthBestValueScreen({ data }: MonthBestValueScreenProps) {
  if (!data.bestValueGame) return null;
  const { game, costPerHour } = data.bestValueGame;

  const valueLabel = costPerHour <= 0.5 ? 'Incredible' : costPerHour <= 1 ? 'Excellent' : costPerHour <= 2 ? 'Great' : costPerHour <= 3 ? 'Good' : 'Fair';
  const valueColor = costPerHour <= 1 ? 'text-emerald-400' : costPerHour <= 3 ? 'text-blue-400' : 'text-yellow-400';

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <Star size={32} className="text-emerald-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-emerald-400/60 mb-4"
      >
        Best Value This Month
      </motion.div>

      {game.thumbnail && (
        <motion.img
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          src={game.thumbnail}
          alt=""
          className="w-24 h-24 rounded-xl object-cover mx-auto mb-4 border-2 border-emerald-500/20"
        />
      )}

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-white mb-4"
      >
        {game.name}
      </motion.h3>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        <div className={`text-5xl font-black ${valueColor}`}>
          ${costPerHour.toFixed(2)}
          <span className="text-lg text-white/40">/hr</span>
        </div>
        <div className={`text-sm font-medium mt-1 ${valueColor}`}>{valueLabel} Value</div>
      </motion.div>
    </div>
  );
}
