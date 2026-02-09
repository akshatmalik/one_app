'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface SharpInsightScreenProps {
  insight: string | null;
}

export function SharpInsightScreen({ insight }: SharpInsightScreenProps) {
  if (!insight) return null;

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <Lightbulb size={48} className="mx-auto mb-6 text-amber-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs uppercase tracking-widest text-amber-400/60 font-bold mb-6"
        >
          The Takeaway
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="text-2xl md:text-4xl font-bold text-white leading-relaxed"
      >
        {insight}
      </motion.p>
    </div>
  );
}
