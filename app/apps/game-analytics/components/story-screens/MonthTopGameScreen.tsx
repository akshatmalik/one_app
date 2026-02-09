'use client';

import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthTopGameScreenProps {
  data: MonthInReviewData;
}

export function MonthTopGameScreen({ data }: MonthTopGameScreenProps) {
  if (!data.topGame) return null;
  const { game, hours, sessions, percentage } = data.topGame;

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {/* Award icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto">
          <Award size={32} className="text-yellow-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-yellow-400/60 mb-4"
      >
        Game of the Month
      </motion.div>

      {/* Thumbnail */}
      {game.thumbnail && (
        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          src={game.thumbnail}
          alt=""
          className="w-36 h-36 rounded-2xl object-cover mx-auto mb-5 border-2 border-yellow-500/30 shadow-lg shadow-yellow-500/10"
        />
      )}

      {/* Game name */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-6"
      >
        {game.name}
      </motion.h3>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-8"
      >
        <div>
          <div className="text-2xl font-bold text-purple-400">{hours.toFixed(1)}h</div>
          <div className="text-xs text-white/40">played</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{sessions}</div>
          <div className="text-xs text-white/40">sessions</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-cyan-400">{percentage.toFixed(0)}%</div>
          <div className="text-xs text-white/40">of time</div>
        </div>
        {game.rating > 0 && (
          <div>
            <div className="text-2xl font-bold text-yellow-400">{game.rating}/10</div>
            <div className="text-xs text-white/40">rating</div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
