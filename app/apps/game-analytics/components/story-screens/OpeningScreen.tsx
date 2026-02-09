'use client';

import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface OpeningScreenProps {
  data: WeekInReviewData;
}

export function OpeningScreen({ data }: OpeningScreenProps) {
  // Build a sharp summary line
  const summaryParts: string[] = [];
  summaryParts.push(`${data.totalHours.toFixed(1)}h across ${data.uniqueGames} game${data.uniqueGames !== 1 ? 's' : ''}`);

  if (data.vsAverage.percentage > 130) {
    summaryParts.push('Your biggest week in a while.');
  } else if (data.vsAverage.percentage < 70 && data.vsAverage.percentage > 0) {
    summaryParts.push('A quieter week than usual.');
  } else if (data.vsLastWeek.trend === 'up') {
    summaryParts.push(`Up ${data.vsLastWeek.hoursDiff.toFixed(1)}h from last week.`);
  } else if (data.vsLastWeek.trend === 'down') {
    summaryParts.push(`Down ${Math.abs(data.vsLastWeek.hoursDiff).toFixed(1)}h from last week.`);
  }

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
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 mb-8"
        >
          Week Recap
        </motion.h1>

        {/* Vibe label */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 uppercase tracking-wide">
              {data.weekVibe}
            </span>
          </div>
        </motion.div>

        {/* Sharp summary line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-xl text-white/50 font-medium max-w-md mx-auto"
        >
          {summaryParts.join('. ')}
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
