'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface Props { hotTake: string; quarterLabel: string; isLoading?: boolean; }

export function QuarterHotTakeScreen({ hotTake, quarterLabel, isLoading }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
          <Flame size={40} className="text-red-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-red-400/60 mb-6"
      >
        {quarterLabel} Hot Take
      </motion.div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/30">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : (
        <motion.blockquote
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-3xl md:text-4xl font-black text-white leading-tight"
        >
          &ldquo;{hotTake}&rdquo;
        </motion.blockquote>
      )}
    </div>
  );
}
