'use client';

import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_STYLES = [
  { bar: 'bg-gradient-to-r from-yellow-500 to-amber-400', text: 'text-yellow-400', height: 'h-40' },
  { bar: 'bg-gradient-to-r from-slate-400 to-slate-300', text: 'text-slate-300', height: 'h-28' },
  { bar: 'bg-gradient-to-r from-amber-700 to-amber-500', text: 'text-amber-500', height: 'h-20' },
];

export function QuarterTop3Screen({ data }: Props) {
  const games = data.top3Games.slice(0, 3);
  if (games.length === 0) return null;

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = games.length >= 2
    ? [games[1], games[0], games[2]].filter(Boolean)
    : games;
  const podiumStyles = games.length >= 2
    ? [RANK_STYLES[1], RANK_STYLES[0], RANK_STYLES[2]]
    : [RANK_STYLES[0]];
  const podiumMedals = games.length >= 2
    ? [MEDALS[1], MEDALS[0], MEDALS[2]]
    : [MEDALS[0]];

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2"
      >
        Top Games — {data.quarterLabel}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-white/30 text-sm mb-10"
      >
        Ranked by hours played this quarter
      </motion.p>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-6">
        {podiumOrder.map((g, i) => {
          const style = podiumStyles[i];
          const medal = podiumMedals[i];
          return (
            <motion.div
              key={g.game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
              className="flex flex-col items-center gap-2"
            >
              {/* Thumbnail */}
              <div className="relative">
                {g.game.thumbnail ? (
                  <img src={g.game.thumbnail} alt={g.game.name} className="w-16 h-16 object-cover rounded-2xl border border-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Gamepad2 size={24} className="text-white/20" />
                  </div>
                )}
                <span className="absolute -top-2 -right-2 text-lg">{medal}</span>
              </div>

              {/* Hours */}
              <div className={`text-lg font-black ${style.text}`}>{g.hours.toFixed(0)}h</div>

              {/* Podium block */}
              <div className={`w-24 ${style.height} ${style.bar} rounded-t-xl flex items-start justify-center pt-2`}>
                <span className="text-xs font-bold text-black/60">{g.percentage.toFixed(0)}%</span>
              </div>

              {/* Name */}
              <div className="text-xs text-white/60 max-w-[80px] text-center leading-tight">{g.game.name}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
