'use client';

import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface OpeningScreenProps {
  data: WeekInReviewData;
}

export function OpeningScreen({ data }: OpeningScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full mb-8 backdrop-blur-sm border border-purple-500/30"
        >
          <Calendar size={20} className="text-purple-300" />
          <span className="text-purple-200 font-medium">{data.weekLabel}</span>
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-6"
        >
          Your Gaming
        </motion.h1>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 mb-12"
        >
          Week Recap
        </motion.h1>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.8, duration: 0.8, type: 'spring' }}
          className="text-8xl mb-8"
        >
          🎮
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-2xl text-white/60 font-medium"
        >
          Let&apos;s see what you&apos;ve been playing...
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 2, duration: 1.5, repeat: Infinity }}
          className="mt-12 flex justify-center"
        >
          <Sparkles className="text-purple-400" size={24} />
        </motion.div>
      </motion.div>
    </div>
  );
}
