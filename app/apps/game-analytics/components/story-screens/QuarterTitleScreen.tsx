'use client';

import { motion } from 'framer-motion';
import { Sparkles, Calendar } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; quarterTitle?: string; aiBlurb?: string | null; }

export function QuarterTitleScreen({ data, quarterTitle, aiBlurb }: Props) {
  const qColors: Record<number, { from: string; to: string; accent: string }> = {
    1: { from: '#60a5fa', to: '#818cf8', accent: 'text-blue-300' },
    2: { from: '#34d399', to: '#60a5fa', accent: 'text-emerald-300' },
    3: { from: '#f59e0b', to: '#f97316', accent: 'text-amber-300' },
    4: { from: '#a78bfa', to: '#ec4899', accent: 'text-purple-300' },
  };
  const colors = qColors[data.quarter] || qColors[1];

  return (
    <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center justify-center min-h-[60vh]">
      {/* Quarter badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border border-white/10"
          style={{ background: `linear-gradient(135deg, ${colors.from}22, ${colors.to}22)` }}
        >
          <Calendar size={22} style={{ color: colors.from }} />
          <span className="text-xl font-bold text-white">{data.quarterLabel}</span>
          <span className="text-sm text-white/40">{data.dateRange}</span>
        </div>
      </motion.div>

      {/* Giant title */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="mb-4"
      >
        <h1
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text leading-none"
          style={{ backgroundImage: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
        >
          Quarter<br />Recap
        </h1>
      </motion.div>

      {/* AI chapter title */}
      {quarterTitle && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-purple-500/30 bg-purple-500/10">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-sm font-semibold text-purple-300 italic">&ldquo;{quarterTitle}&rdquo;</span>
            <Sparkles size={14} className="text-purple-400" />
          </div>
        </motion.div>
      )}

      {/* AI opening blurb */}
      {aiBlurb && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-base text-white/50 italic max-w-md leading-relaxed mb-8"
        >
          {aiBlurb}
        </motion.p>
      )}

      {/* Core stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="flex items-center gap-8"
      >
        <div className="text-center">
          <div className="text-3xl font-black text-white">{data.totalHours.toFixed(0)}h</div>
          <div className="text-xs text-white/30 mt-1">played</div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-3xl font-black text-white">{data.uniqueGames}</div>
          <div className="text-xs text-white/30 mt-1">games</div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-3xl font-black text-white">{data.totalSessions}</div>
          <div className="text-xs text-white/30 mt-1">sessions</div>
        </div>
      </motion.div>
    </div>
  );
}
