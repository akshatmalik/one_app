'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart, ArrowRight } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface ClosingScreenProps {
  data: WeekInReviewData;
}

export function ClosingScreen({ data }: ClosingScreenProps) {
  // Generate a personal closing line based on week data
  let closingLine = 'Keep playing what you love.';
  if (data.completedGames.length > 0 && data.newGamesStarted.length > 0) {
    closingLine = 'Games finished, new ones started. The cycle continues.';
  } else if (data.completedGames.length > 0) {
    closingLine = `${data.completedGames[0].name} is done. What's next?`;
  } else if (data.totalHours >= 20) {
    closingLine = 'Big week. Enjoy the afterglow.';
  } else if (data.totalHours >= 10) {
    closingLine = 'Good balance. See you next week.';
  } else if (data.totalHours > 0) {
    closingLine = 'Every session counts. Until next week.';
  } else {
    closingLine = 'Ready when you are. See you next week.';
  }

  // If there's a top game in queue, tease it
  const nextUp = data.gamesPlayed.length > 0 ? null : null; // Placeholder

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
          className="text-7xl mb-6"
        >
          GG
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4"
        >
          That&apos;s a Wrap
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-lg text-white/40 font-medium mb-12"
        >
          {data.weekLabel}
        </motion.p>

        {/* Compact stat line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex items-center justify-center gap-6 text-white/40 mb-12"
        >
          <span><span className="text-white font-bold">{data.uniqueGames}</span> games</span>
          <span className="text-white/10">|</span>
          <span><span className="text-white font-bold">{data.totalHours.toFixed(1)}</span>h</span>
          <span className="text-white/10">|</span>
          <span><span className="text-white font-bold">{data.totalSessions}</span> sessions</span>
        </motion.div>

        {/* Personal closing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="p-8 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm mb-8"
        >
          <Heart size={28} className="mx-auto mb-4 text-pink-400" />
          <p className="text-xl text-white/80 font-medium">
            {closingLine}
          </p>
        </motion.div>

        {/* Floating elements */}
        {[...Array(8)].map((_, i) => (
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
          className="text-white/30 text-sm"
        >
          Tap to close
        </motion.p>
      </motion.div>
    </div>
  );
}
