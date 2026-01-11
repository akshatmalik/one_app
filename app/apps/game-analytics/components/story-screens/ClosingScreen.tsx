'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface ClosingScreenProps {
  data: WeekInReviewData;
}

export function ClosingScreen({ data }: ClosingScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-8xl mb-8"
        >
          🎮✨
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-6"
        >
          That&apos;s a Wrap!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-2xl text-white/60 font-medium mb-12"
        >
          {data.weekLabel}
        </motion.p>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30">
            <div className="text-3xl font-bold text-purple-300">{data.uniqueGames}</div>
            <div className="text-xs text-white/50 mt-1">Games</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
            <div className="text-3xl font-bold text-blue-300">{data.totalHours.toFixed(1)}h</div>
            <div className="text-xs text-white/50 mt-1">Hours</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl border border-cyan-500/30">
            <div className="text-3xl font-bold text-cyan-300">{data.totalSessions}</div>
            <div className="text-xs text-white/50 mt-1">Sessions</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl border border-pink-500/30">
            <div className="text-3xl font-bold text-pink-300">{data.currentStreak}</div>
            <div className="text-xs text-white/50 mt-1">Streak</div>
          </div>
        </motion.div>

        {/* Encouraging message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="p-8 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm mb-8"
        >
          <Heart size={32} className="mx-auto mb-4 text-pink-400" />
          <p className="text-xl text-white/80 font-medium">
            {data.totalHours >= 20
              ? "You really dove deep this week! Keep chasing those high scores 🚀"
              : data.totalHours >= 10
              ? "Great balance this week! Quality gaming time ⚡"
              : data.totalHours > 0
              ? "Every gaming session counts! Keep enjoying your favorites 🎮"
              : "Ready for your next adventure? 🌟"}
          </p>
        </motion.div>

        {/* Floating elements */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 0.6, 0],
              y: [0, -100, -200],
              x: [0, (Math.random() - 0.5) * 200],
            }}
            transition={{
              delay: 1.5 + i * 0.2,
              duration: 3,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{
              left: `${20 + (i * 60) % 80}%`,
              top: '60%',
            }}
          >
            <Sparkles
              size={16 + (i % 3) * 8}
              className={
                ['text-purple-400', 'text-blue-400', 'text-pink-400', 'text-cyan-400'][i % 4]
              }
            />
          </motion.div>
        ))}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="text-white/40 text-sm"
        >
          Close to see more stats • Press ESC to exit
        </motion.p>
      </motion.div>
    </div>
  );
}
