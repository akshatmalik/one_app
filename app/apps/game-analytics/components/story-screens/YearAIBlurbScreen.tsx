'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  blurb: string | null;
  type: 'year-opening' | 'year-closing' | 'year-hot-take';
  isLoading?: boolean;
  year: number;
}

const CONFIG = {
  'year-opening': {
    label: 'The Year in Words',
    gradient: 'from-amber-400 via-orange-400 to-pink-400',
    textSize: 'text-xl md:text-2xl',
  },
  'year-closing': {
    label: `Farewell`,
    gradient: 'from-purple-400 via-pink-400 to-amber-400',
    textSize: 'text-xl md:text-2xl',
  },
  'year-hot-take': {
    label: 'The Hot Take',
    gradient: 'from-red-400 via-orange-400 to-yellow-400',
    textSize: 'text-2xl md:text-3xl font-black',
  },
};

export function YearAIBlurbScreen({ blurb, type, isLoading, year }: Props) {
  const cfg = CONFIG[type];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5">
          <Sparkles size={12} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">{cfg.label} · {year}</span>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/30">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className={`${cfg.textSize} text-transparent bg-clip-text bg-gradient-to-r ${cfg.gradient} leading-tight`}
        >
          {blurb || `${year} — a year of gaming memories.`}
        </motion.p>
      )}
    </div>
  );
}
