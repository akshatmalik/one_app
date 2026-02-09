'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface MonthHotTakeScreenProps {
  hotTake: string;
}

export function MonthHotTakeScreen({ hotTake }: MonthHotTakeScreenProps) {
  return (
    <div className="w-full max-w-lg mx-auto text-center flex flex-col items-center justify-center">
      {/* Flame icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
          <Flame size={40} className="text-orange-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-orange-400/60">Monthly Hot Take</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-2xl md:text-3xl font-bold text-white leading-snug"
      >
        {hotTake}
      </motion.p>
    </div>
  );
}
