'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { DollarSign, TrendingUp, Gamepad2, Sparkles } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface ValueUtilizedScreenProps {
  data: WeekInReviewData;
}

export function ValueUtilizedScreen({ data }: ValueUtilizedScreenProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(0));

  useEffect(() => {
    const controls = animate(count, data.totalValueUtilized, {
      duration: 2,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [count, data.totalValueUtilized]);

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full mb-4 backdrop-blur-sm border border-emerald-500/30">
          <DollarSign size={20} className="text-emerald-300" />
          <span className="text-emerald-200 font-bold uppercase tracking-wide text-sm">Value Utilized</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white/60 mb-2">
          This week you utilized
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', bounce: 0.4 }}
        className="relative mb-8"
      >
        <motion.div className="flex items-center justify-center">
          <span className="text-5xl md:text-6xl font-black text-emerald-400">$</span>
          <motion.span className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400">
            {rounded}
          </motion.span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-xl md:text-2xl font-bold text-emerald-400/80 mt-2"
        >
          worth of gaming
        </motion.div>
      </motion.div>

      {/* Additional stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
        className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6"
      >
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <Gamepad2 size={20} className="mx-auto mb-1 text-purple-400" />
          <div className="text-xl font-bold text-purple-400">{data.uniqueGames}</div>
          <div className="text-xs text-white/50">games played</div>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <TrendingUp size={20} className="mx-auto mb-1 text-blue-400" />
          <div className="text-xl font-bold text-blue-400">${data.averageGameValue.toFixed(0)}</div>
          <div className="text-xs text-white/50">avg game value</div>
        </div>
      </motion.div>

      {/* Library percentage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.6 }}
        className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20"
      >
        <div className="flex items-center justify-center gap-3">
          <Sparkles size={20} className="text-purple-400" />
          <span className="text-white/70">
            You played <span className="font-bold text-purple-400">{data.libraryPercentagePlayed.toFixed(0)}%</span> of your library
          </span>
        </div>
      </motion.div>
    </div>
  );
}
