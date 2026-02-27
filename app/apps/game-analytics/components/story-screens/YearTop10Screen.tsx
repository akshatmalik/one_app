'use client';

import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-600', ...Array(7).fill('text-white/60')];

export function YearTop10Screen({ data }: Props) {
  const games = data.top10Games.slice(0, 10);
  const maxHours = games[0]?.hours || 1;

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center"
      >
        Top 10 Games of {data.year}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center text-white/30 text-sm mb-6"
      >
        Your definitive ranked list, by hours played
      </motion.p>

      <div className="space-y-2">
        {games.map((g, i) => (
          <motion.div
            key={g.game.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring' }}
            className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors"
          >
            {/* Rank */}
            <div className={`w-7 text-center font-black text-sm ${RANK_COLORS[i]} shrink-0`}>
              {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>

            {/* Thumbnail */}
            {g.game.thumbnail ? (
              <img src={g.game.thumbnail} alt={g.game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Gamepad2 size={16} className="text-white/20" />
              </div>
            )}

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{g.game.name}</div>
              {g.game.rating > 0 && <div className="text-xs text-white/30">{g.game.rating}/10</div>}
            </div>

            {/* Bar + hours */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(g.hours / maxHours) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                  className={`h-full rounded-full ${i === 0 ? 'bg-amber-400' : i < 3 ? 'bg-purple-400' : 'bg-white/30'}`}
                />
              </div>
              <span className={`text-sm font-bold w-12 text-right ${RANK_COLORS[i]}`}>{g.hours.toFixed(0)}h</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
