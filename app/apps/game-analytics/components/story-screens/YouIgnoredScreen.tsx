'use client';

import { motion } from 'framer-motion';
import { Ghost, Gamepad2 } from 'lucide-react';
import { IgnoredGame } from '../../lib/calculations';

interface YouIgnoredScreenProps {
  ignoredGames: IgnoredGame[];
}

export function YouIgnoredScreen({ ignoredGames }: YouIgnoredScreenProps) {
  if (ignoredGames.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/5 to-white/10 rounded-full mb-3 backdrop-blur-sm border border-white/10">
          <Ghost size={18} className="text-white/50" />
          <span className="text-white/50 font-bold uppercase tracking-wide text-sm">You Ignored</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Meanwhile, in Your Backlog...
        </h2>
      </motion.div>

      <div className="space-y-3">
        {ignoredGames.map((item, index) => (
          <motion.div
            key={item.game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.12 }}
            className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5"
          >
            {item.game.thumbnail ? (
              <img
                src={item.game.thumbnail}
                alt={item.game.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0 opacity-50"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                <Gamepad2 size={16} className="text-white/20" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/60 truncate">{item.game.name}</div>
              <div className="text-xs text-white/30">
                {item.daysSinceLastPlay < 999 ? `${item.daysSinceLastPlay} days since last play` : 'Never played'}
                {item.inQueue && item.queuePosition ? ` · Queue #${item.queuePosition}` : ''}
              </div>
            </div>

            <div className="shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-white/30">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-4 text-center text-xs text-white/20"
      >
        Just awareness, not judgment.
      </motion.div>
    </div>
  );
}
