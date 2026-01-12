'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface WeekVibeScreenProps {
  data: WeekInReviewData;
}

export function WeekVibeScreen({ data }: WeekVibeScreenProps) {
  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full mb-8 backdrop-blur-sm">
          <Sparkles size={20} className="text-purple-300" />
          <span className="text-purple-200 font-medium">Your Week&apos;s Vibe</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', bounce: 0.5 }}
        className="mb-12"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-9xl mb-8 inline-block"
        >
          {data.weekVibe.split(' ')[0]}
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-5xl md:text-7xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"
      >
        {data.weekVibe}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
      >
        <div className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl border border-purple-500/30">
          <div className="text-4xl font-black text-purple-300 mb-2">
            {data.uniqueGames}
          </div>
          <div className="text-sm text-white/60">Games</div>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl border border-blue-500/30">
          <div className="text-4xl font-black text-blue-300 mb-2">
            {data.totalHours.toFixed(1)}h
          </div>
          <div className="text-sm text-white/60">Hours</div>
        </div>

        <div className="p-6 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl border border-cyan-500/30">
          <div className="text-4xl font-black text-cyan-300 mb-2">
            {data.totalSessions}
          </div>
          <div className="text-sm text-white/60">Sessions</div>
        </div>

        <div className="p-6 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-2xl border border-pink-500/30">
          <div className="text-4xl font-black text-pink-300 mb-2">
            {data.currentStreak}
          </div>
          <div className="text-sm text-white/60">Day Streak</div>
        </div>
      </motion.div>

      {/* Special badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="flex flex-wrap justify-center gap-3 mt-8"
      >
        {data.perfectWeek && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, type: 'spring' }}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-full border border-emerald-400/50"
          >
            <span className="text-emerald-300 font-bold">🏆 Perfect Week!</span>
          </motion.div>
        )}
        {data.weekendWarrior && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5, type: 'spring' }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full border border-purple-400/50"
          >
            <span className="text-purple-300 font-bold">🎉 Weekend Warrior!</span>
          </motion.div>
        )}
        {data.weekdayGrind && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5, type: 'spring' }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full border border-blue-400/50"
          >
            <span className="text-blue-300 font-bold">💼 Weekday Grinder!</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
