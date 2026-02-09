'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Gamepad2 } from 'lucide-react';
import { MomentumData } from '../../lib/calculations';

interface MomentumReadScreenProps {
  momentum: MomentumData;
}

export function MomentumReadScreen({ momentum }: MomentumReadScreenProps) {
  const TrendIcon = momentum.trend === 'accelerating' ? TrendingUp : momentum.trend === 'decelerating' ? TrendingDown : Minus;
  const trendColor = momentum.trend === 'accelerating' ? 'text-emerald-400' : momentum.trend === 'decelerating' ? 'text-red-400' : 'text-white/50';
  const maxHours = Math.max(...momentum.weeklyHours.map(w => w.hours), 1);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full mb-3 backdrop-blur-sm border border-cyan-500/30">
          <TrendIcon size={18} className={trendColor} />
          <span className="text-cyan-200 font-bold uppercase tracking-wide text-sm">Momentum</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          The Trend
        </h2>
      </motion.div>

      {/* Mini line chart as bars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-end gap-2 h-32 mb-2">
          {momentum.weeklyHours.map((week, index) => {
            const height = maxHours > 0 ? (week.hours / maxHours) * 100 : 0;
            const isLast = index === momentum.weeklyHours.length - 1;
            return (
              <motion.div
                key={index}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                className="flex-1 flex flex-col items-center"
                style={{ transformOrigin: 'bottom' }}
              >
                <div className="text-xs text-white/40 mb-1">{week.hours.toFixed(0)}h</div>
                <div
                  className={`w-full rounded-t-lg ${isLast ? 'bg-cyan-500' : 'bg-white/10'}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </motion.div>
            );
          })}
        </div>
        <div className="flex gap-2">
          {momentum.weeklyHours.map((week, index) => (
            <div key={index} className="flex-1 text-center text-[10px] text-white/30 truncate">
              {week.weekLabel}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trend description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 text-center mb-4"
      >
        <TrendIcon size={24} className={`mx-auto mb-2 ${trendColor}`} />
        <p className="text-white/70 text-sm">{momentum.trendDescription}</p>
      </motion.div>

      {/* Game-level momentum */}
      {momentum.gameMomentum.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="space-y-2"
        >
          <div className="text-xs text-white/30 text-center mb-2">Game Momentum</div>
          {momentum.gameMomentum.slice(0, 3).map((gm) => (
            <div key={gm.game.id} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
              {gm.game.thumbnail ? (
                <img src={gm.game.thumbnail} alt={gm.game.name} className="w-8 h-8 rounded object-cover shrink-0" loading="lazy" />
              ) : (
                <div className="w-8 h-8 rounded bg-white/5 shrink-0 flex items-center justify-center">
                  <Gamepad2 size={12} className="text-white/20" />
                </div>
              )}
              <span className="text-xs text-white/60 flex-1 truncate">{gm.game.name}</span>
              <span className={`text-xs font-medium ${
                gm.trend === 'accelerating' ? 'text-emerald-400' :
                gm.trend === 'decelerating' ? 'text-red-400' :
                gm.trend === 'new' ? 'text-blue-400' : 'text-white/40'
              }`}>
                {gm.description}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
