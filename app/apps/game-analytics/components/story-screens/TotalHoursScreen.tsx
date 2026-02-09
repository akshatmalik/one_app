'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Clock, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface TotalHoursScreenProps {
  data: WeekInReviewData;
}

export function TotalHoursScreen({ data }: TotalHoursScreenProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => latest.toFixed(1));

  useEffect(() => {
    const controls = animate(count, data.totalHours, {
      duration: 2,
      ease: 'easeOut',
    });

    return controls.stop;
  }, [count, data.totalHours]);

  const hoursDiff = data.vsLastWeek.hoursDiff;
  const avgPercent = data.vsAverage.percentage;

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <Clock size={64} className="mx-auto text-blue-400 mb-4" />
        <h2 className="text-3xl md:text-4xl font-bold text-white/60 mb-2">
          You played for
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', bounce: 0.5 }}
        className="relative"
      >
        <motion.div
          className="text-9xl md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400"
        >
          <motion.span>{rounded}</motion.span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-5xl md:text-6xl font-bold text-blue-400/80 mt-4"
        >
          hours
        </motion.div>

        {/* Particle effects */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: [0, Math.cos((i * Math.PI) / 4) * 150],
              y: [0, Math.sin((i * Math.PI) / 4) * 150],
            }}
            transition={{
              delay: 2 + i * 0.1,
              duration: 1.5,
            }}
            className="absolute top-1/2 left-1/2"
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <Zap className="text-cyan-400" size={32} />
          </motion.div>
        ))}
      </motion.div>

      {/* Inline comparison deltas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.6 }}
        className="mt-8 flex items-center justify-center gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full">
          {hoursDiff >= 0 ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-sm font-bold ${hoursDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {hoursDiff >= 0 ? '+' : ''}{hoursDiff.toFixed(1)}h
          </span>
          <span className="text-xs text-white/30">vs last week</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full">
          <span className={`text-sm font-bold ${avgPercent >= 100 ? 'text-emerald-400' : 'text-white/50'}`}>
            {avgPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-white/30">of 4-week avg</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.6 }}
        className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto"
      >
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-3xl font-bold text-purple-400">{data.totalSessions}</div>
          <div className="text-sm text-white/50 mt-1">Sessions</div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-3xl font-bold text-cyan-400">{data.uniqueGames}</div>
          <div className="text-sm text-white/50 mt-1">Games</div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-3xl font-bold text-blue-400">{data.daysActive}/7</div>
          <div className="text-sm text-white/50 mt-1">Active Days</div>
        </div>
      </motion.div>
    </div>
  );
}
