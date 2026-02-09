'use client';

import { motion } from 'framer-motion';
import { Sparkles, Brain, Heart, Loader2 } from 'lucide-react';
import { MonthAIBlurbType } from '../../lib/ai-service';

interface MonthAIBlurbScreenProps {
  blurb: string | null;
  type: MonthAIBlurbType;
  isLoading?: boolean;
  isFallback?: boolean;
}

const config: Record<MonthAIBlurbType, {
  icon: typeof Brain;
  color: string;
  gradient: string;
  border: string;
  title: string;
}> = {
  'month-opening': {
    icon: Brain,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    title: 'AI Reads Your Month',
  },
  'month-closing': {
    icon: Heart,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30',
    title: 'Month Reflection',
  },
};

export function MonthAIBlurbScreen({ blurb, type, isLoading = false, isFallback = false }: MonthAIBlurbScreenProps) {
  const cfg = config[type];
  const Icon = cfg.icon;

  // Silent fallback: don't render if empty
  if (!isLoading && isFallback && (!blurb || blurb.trim() === '')) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${cfg.gradient} rounded-full mb-4 border ${cfg.border}`}>
          <Sparkles size={20} className={cfg.color} />
          <span className={`${cfg.color} font-bold uppercase tracking-wide text-sm`}>AI Insight</span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <Icon size={32} className={cfg.color} />
          <h2 className="text-2xl md:text-3xl font-bold text-white">{cfg.title}</h2>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className={`relative p-8 bg-gradient-to-br ${cfg.gradient} rounded-2xl border ${cfg.border} min-h-[200px] flex items-center justify-center`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className={`${cfg.color} animate-spin`} />
            <div className="text-white/60 text-center">
              <p className="text-sm font-medium mb-1">AI is analyzing your month...</p>
              <p className="text-xs text-white/40">Generating personalized insights</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -top-2 -left-2 text-6xl opacity-20 font-serif text-white">&ldquo;</div>
            <div className="absolute -bottom-6 -right-2 text-6xl opacity-20 font-serif text-white">&rdquo;</div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-white text-lg md:text-xl leading-relaxed text-center relative z-10 px-4"
            >
              {blurb}
            </motion.p>
          </div>
        )}
      </motion.div>

      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 text-white/30 text-xs">
            <Sparkles size={14} />
            <span>Powered by Gemini AI</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
