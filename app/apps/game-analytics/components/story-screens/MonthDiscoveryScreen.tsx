'use client';

import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthDiscoveryScreenProps {
  data: MonthInReviewData;
}

export function MonthDiscoveryScreen({ data }: MonthDiscoveryScreenProps) {
  if (!data.discoveryGame) return null;
  const { game, hours, sessions } = data.discoveryGame;

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto">
          <Compass size={32} className="text-cyan-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-cyan-400/60 mb-4"
      >
        Discovery of the Month
      </motion.div>

      {game.thumbnail && (
        <motion.img
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          src={game.thumbnail}
          alt=""
          className="w-28 h-28 rounded-2xl object-cover mx-auto mb-4 border-2 border-cyan-500/20"
        />
      )}

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-white mb-2"
      >
        {game.name}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-white/40 mb-6"
      >
        Started this month and already put in
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        className="flex justify-center gap-8"
      >
        <div>
          <div className="text-3xl font-black text-cyan-400">{hours.toFixed(1)}h</div>
          <div className="text-xs text-white/40">played</div>
        </div>
        <div>
          <div className="text-3xl font-black text-blue-400">{sessions}</div>
          <div className="text-xs text-white/40">sessions</div>
        </div>
      </motion.div>
    </div>
  );
}
