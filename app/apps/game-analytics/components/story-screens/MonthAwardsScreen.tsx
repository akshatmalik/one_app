'use client';

import { motion } from 'framer-motion';
import { MonthAward } from '../../lib/calculations';

interface MonthAwardsScreenProps {
  awards: MonthAward[];
}

export function MonthAwardsScreen({ awards }: MonthAwardsScreenProps) {
  if (awards.length === 0) return null;

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-yellow-400/60 mb-8"
      >
        Monthly Awards
      </motion.div>

      <div className="space-y-4">
        {awards.map((award, i) => (
          <motion.div
            key={award.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
            className="relative overflow-hidden p-4 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 rounded-2xl border border-yellow-500/10"
          >
            <div className="flex items-center gap-4">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, type: 'spring' }}
                className="text-3xl"
              >
                {award.emoji}
              </motion.span>
              <div className="flex-1 text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/50">{award.title}</div>
                <div className="text-lg font-bold text-white">{award.recipient}</div>
                <div className="text-xs text-white/40">{award.detail}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
