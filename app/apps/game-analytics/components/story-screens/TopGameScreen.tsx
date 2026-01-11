'use client';

import { motion } from 'framer-motion';
import { Trophy, Clock, Target } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface TopGameScreenProps {
  data: WeekInReviewData;
}

export function TopGameScreen({ data }: TopGameScreenProps) {
  if (!data.topGame) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full mb-4 backdrop-blur-sm border border-amber-500/30">
          <Trophy size={24} className="text-amber-300" />
          <span className="text-amber-200 font-bold uppercase tracking-wide">Your Obsession</span>
        </div>
      </motion.div>

      {/* Game thumbnail with reveal */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
        className="relative mb-8"
      >
        {data.topGame.game.thumbnail ? (
          <div className="relative mx-auto w-64 h-64 md:w-80 md:h-80">
            {/* Glow effect */}
            <div
              className="absolute inset-0 blur-3xl opacity-40 scale-110"
              style={{
                backgroundImage: `url(${data.topGame.game.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Main image */}
            <motion.img
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ delay: 1, duration: 2, repeat: Infinity }}
              src={data.topGame.game.thumbnail}
              alt={data.topGame.game.name}
              className="relative w-full h-full rounded-2xl object-cover border-4 border-purple-500/30 shadow-2xl"
            />
          </div>
        ) : (
          <div className="mx-auto w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-4 border-purple-500/30" />
        )}
      </motion.div>

      {/* Game name */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-4xl md:text-6xl font-black text-center text-white mb-8"
      >
        {data.topGame.game.name}
      </motion.h2>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl border border-purple-500/30 text-center"
        >
          <Clock size={32} className="mx-auto mb-3 text-purple-400" />
          <div className="text-4xl font-black text-purple-300 mb-1">
            {data.topGame.hours.toFixed(1)}h
          </div>
          <div className="text-sm text-white/50">Time Played</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, duration: 0.5, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl border border-blue-500/30 text-center"
        >
          <div className="text-5xl font-black text-blue-300 mb-3">{data.topGame.percentage.toFixed(0)}%</div>
          <div className="text-sm text-white/50">Of Your Week</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.6, duration: 0.5, type: 'spring' }}
          className="p-6 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl border border-cyan-500/30 text-center"
        >
          <Target size={32} className="mx-auto mb-3 text-cyan-400" />
          <div className="text-4xl font-black text-cyan-300 mb-1">
            {data.topGame.sessions}
          </div>
          <div className="text-sm text-white/50">Sessions</div>
        </motion.div>
      </motion.div>
    </div>
  );
}
