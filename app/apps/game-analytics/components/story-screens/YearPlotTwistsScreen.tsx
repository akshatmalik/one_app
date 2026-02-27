'use client';

import { motion } from 'framer-motion';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

const SEVERITY_STYLES = {
  minor: 'border-blue-500/20 bg-blue-500/5',
  major: 'border-purple-500/25 bg-purple-500/10',
  epic: 'border-amber-500/35 bg-amber-500/12',
};

export function YearPlotTwistsScreen({ data }: Props) {
  const twists = data.plotTwists.slice(0, 5);

  if (twists.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl mb-4">📖</motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-2xl font-black text-white/50 mb-2">A Steady Year</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/30 text-sm">No major dramatic shifts. Consistent, reliable gaming throughout {data.year}.</motion.p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center">
        Defining Moments of {data.year}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-center text-white/30 text-sm mb-6">
        The dramatic plot twists in your gaming story
      </motion.p>

      <div className="space-y-3">
        {twists.map((twist, i) => (
          <motion.div
            key={twist.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
            className={`p-4 rounded-2xl border ${SEVERITY_STYLES[twist.severity]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{twist.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{twist.title}</span>
                  {twist.severity === 'epic' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">Epic</span>}
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{twist.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
