'use client';

import { motion } from 'framer-motion';
import { Award, Gamepad2 } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';
import { getWeekAwards } from '../../lib/calculations';

interface WeekAwardsScreenProps {
  data: WeekInReviewData;
}

const awardColors = [
  'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
  'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  'from-orange-500/20 to-red-500/20 border-orange-500/30',
];

const awardEmojis = ['🏆', '💎', '📈', '🎯', '⚡'];

export function WeekAwardsScreen({ data }: WeekAwardsScreenProps) {
  const awards = getWeekAwards(data);

  if (awards.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full mb-3 backdrop-blur-sm border border-yellow-500/30">
          <Award size={18} className="text-yellow-300" />
          <span className="text-yellow-200 font-bold uppercase tracking-wide text-sm">Week Awards</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          And the Winners Are...
        </h2>
      </motion.div>

      <div className="space-y-3">
        {awards.map((award, index) => (
          <motion.div
            key={award.title}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.15, type: 'spring' }}
            className={`p-4 bg-gradient-to-r ${awardColors[index % awardColors.length]} rounded-xl border relative overflow-hidden`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl shrink-0">{awardEmojis[index % awardEmojis.length]}</div>

              {award.thumbnail ? (
                <img
                  src={award.thumbnail}
                  alt={award.winner}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                  <Gamepad2 size={16} className="text-white/20" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/40 uppercase tracking-wide font-bold">{award.title}</div>
                <div className="text-sm font-bold text-white truncate">{award.winner}</div>
                <div className="text-xs text-white/50">{award.stat}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
