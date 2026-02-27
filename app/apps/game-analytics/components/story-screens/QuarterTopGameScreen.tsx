'use client';

import { motion } from 'framer-motion';
import { Gamepad2, Clock, Zap, Star } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterTopGameScreen({ data }: Props) {
  const top = data.topGame;
  if (!top) return null;

  const cph = top.game.price > 0 ? (top.game.price / (top.game.playLogs?.reduce((s, l) => s + l.hours, 0) || 1)).toFixed(2) : null;

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        Game of the Quarter
      </motion.div>

      {/* Hero thumbnail */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
        className="relative mx-auto mb-6 w-48 h-48"
      >
        {top.game.thumbnail ? (
          <img
            src={top.game.thumbnail}
            alt={top.game.name}
            className="w-full h-full object-cover rounded-3xl border-2 border-purple-500/40"
            style={{ boxShadow: '0 0 60px rgba(168,85,247,0.4)' }}
          />
        ) : (
          <div className="w-full h-full rounded-3xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/40 flex items-center justify-center" style={{ boxShadow: '0 0 60px rgba(168,85,247,0.4)' }}>
            <Gamepad2 size={64} className="text-purple-300" />
          </div>
        )}
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-xl">
          👑
        </div>
      </motion.div>

      {/* Game name */}
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-3xl font-black text-white mb-1"
      >
        {top.game.name}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-white/40 mb-8"
      >
        {top.percentage.toFixed(0)}% of your {data.quarterLabel} playtime
      </motion.p>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-6"
      >
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center text-blue-400 mb-1"><Clock size={14} /></div>
          <div className="text-2xl font-black text-blue-400">{top.hours.toFixed(1)}h</div>
          <div className="text-xs text-white/30">hours</div>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center text-purple-400 mb-1"><Zap size={14} /></div>
          <div className="text-2xl font-black text-purple-400">{top.sessions}</div>
          <div className="text-xs text-white/30">sessions</div>
        </div>
        {top.game.rating > 0 && (
          <>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-yellow-400 mb-1"><Star size={14} /></div>
              <div className="text-2xl font-black text-yellow-400">{top.game.rating}/10</div>
              <div className="text-xs text-white/30">rating</div>
            </div>
          </>
        )}
        {cph && (
          <>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-xs text-emerald-400 mb-1">$/hr</div>
              <div className="text-2xl font-black text-emerald-400">${cph}</div>
              <div className="text-xs text-white/30">value</div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
