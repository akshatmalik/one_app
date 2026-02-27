'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

const PERSONALITY_ICONS: Record<string, string> = {
  Completionist: '🏆', 'Deep Diver': '🌊', Sampler: '🎲',
  'Backlog Hoarder': '📚', 'Balanced Gamer': '⚖️', Speedrunner: '⚡', Explorer: '🗺️',
};

export function YearPersonalityEvolutionScreen({ data }: Props) {
  const evolution = data.personalityEvolution;
  const current = data.personality;

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center">
        Personality Evolution · {data.year}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-center text-white/30 text-sm mb-8">
        How your gaming identity shifted quarter by quarter
      </motion.p>

      {evolution.length >= 2 ? (
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {evolution.map((snap, i) => (
            <motion.div key={snap.period} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.15, type: 'spring' }} className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-3xl mb-1">{PERSONALITY_ICONS[snap.personality] || '🎮'}</div>
                <div className="text-xs text-white/60 font-semibold">{snap.personality}</div>
                <div className="text-[10px] text-white/25">{snap.period}</div>
              </div>
              {i < evolution.length - 1 && <ChevronRight size={16} className="text-white/20 shrink-0" />}
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mb-8">
          <div className="text-7xl mb-4">{PERSONALITY_ICONS[current.type] || '🎮'}</div>
          <div className="text-2xl font-black text-white">{current.type}</div>
          <div className="text-sm text-white/40 mt-2">Your {data.year} gaming persona</div>
        </motion.div>
      )}

      {/* Current personality detail */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/20"
      >
        <div className="text-sm font-bold text-purple-300 mb-2">{current.type} — Your Year-End Identity</div>
        <p className="text-sm text-white/50 leading-relaxed">{current.description}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {current.traits.slice(0, 3).map(trait => (
            <span key={trait} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">{trait}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
