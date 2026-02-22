'use client';

import { motion } from 'framer-motion';
import { OscarAwardsData } from '../../lib/calculations';

interface AwardIntroScreenProps {
  data: OscarAwardsData;
  periodType: 'week' | 'month' | 'year';
}

export function AwardIntroScreen({ data, periodType }: AwardIntroScreenProps) {
  const periodLabel = periodType === 'week' ? 'Week' : periodType === 'month' ? 'Month' : 'Year';
  const count = data.awards.length;

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center text-center space-y-6 min-h-[60vh]">
      {/* Trophy icon */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="text-7xl"
      >
        🎬
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="space-y-2"
      >
        <div className="text-[11px] font-bold uppercase tracking-widest text-yellow-400/70">
          Oscar Ceremony
        </div>
        <h1 className="text-3xl font-bold text-white leading-tight">
          The {periodLabel}<br />Awards
        </h1>
        <p className="text-sm text-white/40">{data.periodLabel}</p>
      </motion.div>

      {/* Category count */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.05] border border-white/10"
      >
        <span className="text-2xl font-bold text-yellow-300">{count}</span>
        <div className="text-left">
          <div className="text-xs font-semibold text-white">
            {count === 1 ? 'Category' : 'Categories'}
          </div>
          <div className="text-[11px] text-white/40">awaiting your verdict</div>
        </div>
      </motion.div>

      {/* Mechanic explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.6 }}
        className="space-y-2"
      >
        <p className="text-sm text-white/50 leading-relaxed max-w-xs">
          For each award, pick your nominee — then open the envelope to see what the AI had in mind.
        </p>
        <p className="text-xs text-white/30">
          Your pick is what counts.
        </p>
      </motion.div>

      {/* Tap to begin */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="text-xs text-white/25 pt-2"
      >
        Tap to begin →
      </motion.div>
    </div>
  );
}
