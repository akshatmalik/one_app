'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; yearTitle?: string; aiBlurb?: string | null; }

export function YearTitleScreen({ data, yearTitle, aiBlurb }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center justify-center min-h-[70vh]">
      {/* Epic year number */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
        className="mb-4"
      >
        <span
          className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #f97316, #ec4899, #a78bfa)' }}
        >
          {data.year}
        </span>
      </motion.div>

      {/* AI year title */}
      {yearTitle && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-amber-500/30 bg-amber-500/10">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-base font-bold text-amber-300 italic">&ldquo;{yearTitle}&rdquo;</span>
            <Sparkles size={16} className="text-amber-400" />
          </div>
        </motion.div>
      )}

      {/* Tagline */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-2xl font-black text-white/80 mb-4"
      >
        Your Gaming Year, Told in Full
      </motion.h2>

      {/* AI opening blurb */}
      {aiBlurb && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-base text-white/40 italic max-w-lg leading-relaxed mb-10"
        >
          {aiBlurb}
        </motion.p>
      )}

      {/* Key numbers */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex items-center gap-10"
      >
        <div className="text-center">
          <div className="text-4xl font-black text-amber-400">{data.totalHours.toFixed(0)}h</div>
          <div className="text-xs text-white/30 mt-1">hours played</div>
        </div>
        <div className="w-px h-14 bg-white/10" />
        <div className="text-center">
          <div className="text-4xl font-black text-purple-400">{data.uniqueGames}</div>
          <div className="text-xs text-white/30 mt-1">games</div>
        </div>
        <div className="w-px h-14 bg-white/10" />
        <div className="text-center">
          <div className="text-4xl font-black text-emerald-400">{data.completedGames.length}</div>
          <div className="text-xs text-white/30 mt-1">completed</div>
        </div>
      </motion.div>
    </div>
  );
}
