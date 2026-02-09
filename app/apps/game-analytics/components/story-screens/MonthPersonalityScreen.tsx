'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData } from '../../lib/calculations';
import { Game } from '../../lib/types';

interface MonthPersonalityScreenProps {
  data: MonthInReviewData;
  allGames: Game[];
}

const EMOJIS: Record<string, string> = {
  Completionist: '🏆',
  'Deep Diver': '🤿',
  Sampler: '🎲',
  'Backlog Hoarder': '📦',
  'Balanced Gamer': '⚖️',
  Speedrunner: '⚡',
  Explorer: '🧭',
};

export function MonthPersonalityScreen({ data, allGames }: MonthPersonalityScreenProps) {
  const monthP = data.personality;
  if (!monthP || monthP.score === 0) return null;

  // Calculate overall personality for drift comparison
  const ownedGames = allGames.filter(g => g.status !== 'Wishlist');
  const overallType = ownedGames.length > 0 ? 'your overall' : null;

  const isDrift = overallType !== null;

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        Gaming Personality
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-6xl mb-4"
      >
        {EMOJIS[monthP.type] || '🎮'}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-2"
      >
        {monthP.type}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-white/40 mb-6"
      >
        {monthP.description}
      </motion.p>

      {/* Score bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-48 mx-auto mb-6"
      >
        <div className="bg-white/10 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${monthP.score}%` }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          />
        </div>
        <div className="text-xs text-white/30 mt-1">{monthP.score}% match</div>
      </motion.div>

      {/* Traits */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {monthP.traits.map((trait, i) => (
          <motion.span
            key={trait}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 + i * 0.1 }}
            className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300"
          >
            {trait}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
