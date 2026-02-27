'use client';

import { motion } from 'framer-motion';
import { Gamepad2, Clock, Zap, Star, DollarSign } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

export function YearGameOfYearScreen({ data }: Props) {
  const top = data.topGame;
  if (!top) return null;

  const totalGameHours = top.game.playLogs?.reduce((s, l) => s + l.hours, 0) || top.hours;
  const cph = top.game.price > 0 && totalGameHours > 0 ? top.game.price / totalGameHours : null;

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-amber-400/60 mb-4"
      >
        Game of {data.year}
      </motion.div>

      {/* Crown */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring' }}
        className="text-6xl mb-4"
      >
        👑
      </motion.div>

      {/* Thumbnail */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring' }}
        className="relative mx-auto mb-6 w-56 h-56"
      >
        {top.game.thumbnail ? (
          <img
            src={top.game.thumbnail}
            alt={top.game.name}
            className="w-full h-full object-cover rounded-3xl"
            style={{ boxShadow: '0 0 80px rgba(245,158,11,0.5), 0 0 120px rgba(245,158,11,0.2)' }}
          />
        ) : (
          <div className="w-full h-full rounded-3xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border-2 border-amber-500/50 flex items-center justify-center" style={{ boxShadow: '0 0 80px rgba(245,158,11,0.5)' }}>
            <Gamepad2 size={72} className="text-amber-300" />
          </div>
        )}
        {/* Gold ring */}
        <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/50" />
      </motion.div>

      {/* Name */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-1"
      >
        {top.game.name}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-white/30 mb-8"
      >
        {top.percentage.toFixed(0)}% of your {data.year} gaming hours
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-6 flex-wrap"
      >
        <div className="text-center">
          <div className="flex justify-center text-amber-400 mb-1"><Clock size={14} /></div>
          <div className="text-2xl font-black text-amber-400">{top.hours.toFixed(0)}h</div>
          <div className="text-xs text-white/30">hours</div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="flex justify-center text-purple-400 mb-1"><Zap size={14} /></div>
          <div className="text-2xl font-black text-purple-400">{top.sessions}</div>
          <div className="text-xs text-white/30">sessions</div>
        </div>
        {top.game.rating > 0 && (
          <>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="flex justify-center text-yellow-400 mb-1"><Star size={14} /></div>
              <div className="text-2xl font-black text-yellow-400">{top.game.rating}/10</div>
              <div className="text-xs text-white/30">rating</div>
            </div>
          </>
        )}
        {cph !== null && (
          <>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="flex justify-center text-emerald-400 mb-1"><DollarSign size={14} /></div>
              <div className="text-2xl font-black text-emerald-400">${cph.toFixed(2)}/hr</div>
              <div className="text-xs text-white/30">value</div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
