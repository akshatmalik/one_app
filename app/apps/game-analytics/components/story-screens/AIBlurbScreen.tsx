'use client';

import { motion } from 'framer-motion';
import { Sparkles, Brain, Target, Trophy, Palette, DollarSign, Heart, Loader2, Zap, RotateCcw, Flame, AlertCircle } from 'lucide-react';
import { AIBlurbType } from '../../lib/ai-service';

interface AIBlurbScreenProps {
  blurb: string | null;
  type: AIBlurbType;
  isLoading?: boolean;
  error?: string;
  isFallback?: boolean;
}

// Icon and color mapping for different blurb types
const blurbConfig: Record<AIBlurbType, {
  icon: typeof Sparkles;
  color: string;
  gradient: string;
  border: string;
  title: string;
}> = {
  'opening-personality': {
    icon: Brain,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    title: 'Your Gaming DNA',
  },
  'top-game-deep-dive': {
    icon: Target,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30',
    title: 'Game Focus Insights',
  },
  'session-patterns': {
    icon: Brain,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-500/30',
    title: 'Pattern Recognition',
  },
  'achievement-motivation': {
    icon: Trophy,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    title: 'Achievement Analysis',
  },
  'genre-insights': {
    icon: Palette,
    color: 'text-pink-400',
    gradient: 'from-pink-500/20 to-purple-500/20',
    border: 'border-pink-500/30',
    title: 'Genre Explorer',
  },
  'value-wisdom': {
    icon: DollarSign,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    title: 'Value Insights',
  },
  'gaming-behavior': {
    icon: Zap,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    border: 'border-yellow-500/30',
    title: 'Gaming Behavior',
  },
  'comeback-games': {
    icon: RotateCcw,
    color: 'text-indigo-400',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    border: 'border-indigo-500/30',
    title: 'Comeback Champions',
  },
  'binge-sessions': {
    icon: Flame,
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30',
    title: 'Epic Sessions',
  },
  'closing-reflection': {
    icon: Heart,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30',
    title: 'Week Reflection',
  },
};

export function AIBlurbScreen({ blurb, type, isLoading = false, error, isFallback = false }: AIBlurbScreenProps) {
  const config = blurbConfig[type];
  const Icon = config.icon;

  // Silent fallback: if blurb is empty and it's a fallback, show nothing
  if (!isLoading && isFallback && (!blurb || blurb.trim() === '')) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header with icon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${config.gradient} rounded-full mb-4 backdrop-blur-sm border ${config.border}`}>
          <Sparkles size={20} className={config.color} />
          <span className={`${config.color} font-bold uppercase tracking-wide text-sm`}>
            AI Insight
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <Icon size={32} className={config.color} />
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            {config.title}
          </h2>
        </div>
      </motion.div>

      {/* AI Blurb Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className={`relative p-8 bg-gradient-to-br ${config.gradient} rounded-2xl border ${config.border} backdrop-blur-sm min-h-[200px] flex items-center justify-center`}
      >
        {isLoading ? (
          // Loading state
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className={`${config.color} animate-spin`} />
            <div className="text-white/60 text-center">
              <p className="text-sm font-medium mb-1">AI is analyzing your gaming week...</p>
              <p className="text-xs text-white/40">Generating personalized insights</p>
            </div>
          </div>
        ) : (
          // AI-generated content
          <div className="relative">
            {/* Quote marks decoration */}
            <div className="absolute -top-2 -left-2 text-6xl opacity-20 font-serif text-white">
              &ldquo;
            </div>
            <div className="absolute -bottom-6 -right-2 text-6xl opacity-20 font-serif text-white">
              &rdquo;
            </div>

            {/* AI text */}
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

      {/* AI Attribution */}
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

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-300 font-semibold text-sm mb-1">
                {isFallback ? 'AI Generation Failed' : 'Error'}
              </h4>
              <p className="text-red-200/80 text-xs leading-relaxed break-words">
                {error}
              </p>
              {isFallback && (
                <p className="text-red-200/60 text-xs mt-2 italic">
                  Showing fallback message instead
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
