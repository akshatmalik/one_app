'use client';

import { motion } from 'framer-motion';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

const PERSONALITY_ICONS: Record<string, string> = {
  Completionist: '🏆',
  'Deep Diver': '🌊',
  Sampler: '🎲',
  'Backlog Hoarder': '📚',
  'Balanced Gamer': '⚖️',
  Speedrunner: '⚡',
  Explorer: '🗺️',
};

const PERSONALITY_COLORS: Record<string, string> = {
  Completionist: '#f59e0b',
  'Deep Diver': '#60a5fa',
  Sampler: '#a78bfa',
  'Backlog Hoarder': '#34d399',
  'Balanced Gamer': '#f97316',
  Speedrunner: '#ec4899',
  Explorer: '#8b5cf6',
};

export function QuarterPersonalityScreen({ data }: Props) {
  const { personality } = data;
  const icon = PERSONALITY_ICONS[personality.type] || '🎮';
  const color = PERSONALITY_COLORS[personality.type] || '#a78bfa';

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        {data.quarterLabel} Personality
      </motion.div>

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-8xl mb-6"
      >
        {icon}
      </motion.div>

      {/* Type */}
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-4xl font-black mb-2"
        style={{ color }}
      >
        {personality.type}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-white/40 mb-8 leading-relaxed"
      >
        {personality.description}
      </motion.p>

      {/* Top traits */}
      <div className="space-y-3">
        {personality.traits.slice(0, 3).map((trait, i) => (
          <motion.div
            key={trait}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm text-white/60 text-left">{trait}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="mt-6 text-xs text-white/25"
      >
        Based on your {data.quarterLabel} behavior — may differ from your all-time type
      </motion.p>
    </div>
  );
}
