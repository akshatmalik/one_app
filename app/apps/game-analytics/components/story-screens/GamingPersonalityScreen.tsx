'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface GamingPersonalityScreenProps {
  data: WeekInReviewData;
}

const personalityConfig = {
  'Monogamous': {
    emoji: '🎯',
    gradient: 'from-purple-500 via-pink-500 to-purple-600',
    title: 'The Committed Gamer',
    description: 'You know what you love and you stick with it',
    traits: ['Focused', 'Dedicated', 'Deep Diver'],
  },
  'Dabbler': {
    emoji: '🎮',
    gradient: 'from-blue-500 via-cyan-500 to-blue-600',
    title: 'The Selective Player',
    description: 'A small rotation of trusted favorites',
    traits: ['Balanced', 'Selective', 'Quality over Quantity'],
  },
  'Variety Seeker': {
    emoji: '🌈',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    title: 'The Adventurer',
    description: 'Always exploring new gaming experiences',
    traits: ['Curious', 'Versatile', 'Explorer'],
  },
  'Juggler': {
    emoji: '🤹',
    gradient: 'from-amber-500 via-orange-500 to-red-600',
    title: 'The Multi-Tasker',
    description: 'Why pick one when you can play them all?',
    traits: ['Ambitious', 'Energetic', 'Never Bored'],
  },
};

export function GamingPersonalityScreen({ data }: GamingPersonalityScreenProps) {
  const config = personalityConfig[data.gamingStyle as keyof typeof personalityConfig];

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
          <Sparkles size={20} className="text-purple-300" />
          <span className="text-purple-200 font-medium">Your Gaming Personality</span>
        </div>
      </motion.div>

      {/* Emoji reveal */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', bounce: 0.6 }}
        className="text-9xl mb-8"
      >
        {config.emoji}
      </motion.div>

      {/* Personality type */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <h2 className={`text-5xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r ${config.gradient}`}>
          {data.gamingStyle}
        </h2>
        <p className="text-2xl md:text-3xl font-bold text-white/80 mb-3">
          {config.title}
        </p>
        <p className="text-xl text-white/50 mb-8">
          {config.description}
        </p>
      </motion.div>

      {/* Traits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="flex flex-wrap justify-center gap-3 mb-12"
      >
        {config.traits.map((trait, index) => (
          <motion.div
            key={trait}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.2 + index * 0.1, duration: 0.4, type: 'spring' }}
            className="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
          >
            <span className="text-white font-medium">{trait}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Focus score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="max-w-md mx-auto p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm"
      >
        <p className="text-sm text-white/50 mb-3">Focus Score</p>
        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-4">
          {data.focusScore}%
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.focusScore}%` }}
            transition={{ delay: 2, duration: 1.5, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${config.gradient} rounded-full`}
          />
        </div>
      </motion.div>
    </div>
  );
}
