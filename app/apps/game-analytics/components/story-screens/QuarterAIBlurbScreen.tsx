'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  blurb: string | null;
  type: 'quarter-opening' | 'quarter-closing';
  isLoading?: boolean;
  quarterLabel: string;
}

const CONFIG = {
  'quarter-opening': {
    label: 'Opening Reflection',
    icon: '✦',
    gradient: 'from-purple-400 via-blue-400 to-cyan-400',
    textSize: 'text-2xl md:text-3xl',
  },
  'quarter-closing': {
    label: 'Chapter Closed',
    icon: '✦',
    gradient: 'from-amber-400 via-orange-400 to-red-400',
    textSize: 'text-2xl md:text-3xl',
  },
};

export function QuarterAIBlurbScreen({ blurb, type, isLoading, quarterLabel }: Props) {
  const cfg = CONFIG[type];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5">
          <Sparkles size={12} className="text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">{cfg.label} · {quarterLabel}</span>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/30">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className={`${cfg.textSize} font-black text-transparent bg-clip-text bg-gradient-to-r ${cfg.gradient} leading-tight`}
        >
          {blurb || `${quarterLabel} — a chapter in your gaming story.`}
        </motion.p>
      )}
    </div>
  );
}
