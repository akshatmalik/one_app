'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface ComparisonScreenProps {
  data: WeekInReviewData;
}

export function ComparisonScreen({ data }: ComparisonScreenProps) {
  const isAboveAverage = data.vsAverage.percentage >= 100;
  const trendColor =
    data.vsLastWeek.trend === 'up'
      ? 'text-emerald-400'
      : data.vsLastWeek.trend === 'down'
      ? 'text-red-400'
      : 'text-white/40';

  const TrendIcon =
    data.vsLastWeek.trend === 'up'
      ? TrendingUp
      : data.vsLastWeek.trend === 'down'
      ? TrendingDown
      : Minus;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full mb-4 backdrop-blur-sm border border-purple-500/30">
          <TrendingUp size={24} className="text-purple-300" />
          <span className="text-purple-200 font-bold uppercase tracking-wide">Your Progress</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          How You&apos;re Trending
        </h2>
      </motion.div>

      {/* vs Last Week */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-8 p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">vs Last Week</h3>
          <TrendIcon size={32} className={trendColor} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="p-4 bg-white/5 rounded-xl text-center"
          >
            <div className={`text-3xl font-bold ${trendColor} mb-1`}>
              {data.vsLastWeek.hoursDiff > 0 ? '+' : ''}
              {data.vsLastWeek.hoursDiff.toFixed(1)}h
            </div>
            <div className="text-sm text-white/60">Hours</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="p-4 bg-white/5 rounded-xl text-center"
          >
            <div className={`text-3xl font-bold ${trendColor} mb-1`}>
              {data.vsLastWeek.gamesDiff > 0 ? '+' : ''}
              {data.vsLastWeek.gamesDiff}
            </div>
            <div className="text-sm text-white/60">Games</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="p-4 bg-white/5 rounded-xl text-center"
          >
            <div className={`text-3xl font-bold ${trendColor} mb-1`}>
              {data.vsLastWeek.sessionsDiff > 0 ? '+' : ''}
              {data.vsLastWeek.sessionsDiff}
            </div>
            <div className="text-sm text-white/60">Sessions</div>
          </motion.div>
        </div>
      </motion.div>

      {/* vs Average */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm"
      >
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          vs Your 4-Week Average
        </h3>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ delay: 1.2, duration: 1.5, ease: 'easeInOut' }}
            className={`text-8xl md:text-9xl font-black mb-4 ${
              isAboveAverage
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400'
            }`}
          >
            {data.vsAverage.percentage.toFixed(0)}%
          </motion.div>
          <p className="text-xl text-white/60">of your average week</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className={`p-4 rounded-xl text-center ${
            isAboveAverage
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-blue-500/20 border border-blue-500/30'
          }`}
        >
          <p className="text-lg font-semibold text-white">
            {data.vsAverage.hoursDiff >= 0 ? '+' : ''}
            {data.vsAverage.hoursDiff.toFixed(1)} hours from average
          </p>
          <p className="text-sm text-white/50 mt-1">
            {isAboveAverage
              ? "You&apos;re gaming more than usual! 🚀"
              : "A lighter week than usual 😌"}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
