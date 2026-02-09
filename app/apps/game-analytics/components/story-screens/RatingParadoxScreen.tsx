'use client';

import { motion } from 'framer-motion';
import { Scale, Star, Gamepad2 } from 'lucide-react';
import { RatingParadox } from '../../lib/calculations';

interface RatingParadoxScreenProps {
  paradox: RatingParadox;
}

export function RatingParadoxScreen({ paradox }: RatingParadoxScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full mb-3 backdrop-blur-sm border border-violet-500/30">
          <Scale size={18} className="text-violet-300" />
          <span className="text-violet-200 font-bold uppercase tracking-wide text-sm">Rating vs Reality</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {paradox.hasParadox ? 'The Paradox' : 'Perfect Alignment'}
        </h2>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-xl border border-violet-500/20 text-center mb-6"
      >
        <p className="text-white/70 text-sm leading-relaxed">{paradox.summary}</p>
      </motion.div>

      {/* Two columns: What you play vs What you love */}
      {paradox.hasParadox && (
        <div className="grid grid-cols-2 gap-3">
          {/* What you play */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-xs text-white/30 text-center mb-2 font-bold uppercase tracking-wide">What You Play</div>
            {paradox.playedButLowRated.slice(0, 2).map((item) => (
              <div key={item.game.id} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg mb-1">
                {item.game.thumbnail ? (
                  <img src={item.game.thumbnail} alt={item.game.name} className="w-8 h-8 rounded object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 shrink-0 flex items-center justify-center">
                    <Gamepad2 size={12} className="text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60 truncate">{item.game.name}</div>
                  <div className="text-[10px] text-white/30">{item.hours.toFixed(1)}h</div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-white/40">{item.rating}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* What you love */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-xs text-white/30 text-center mb-2 font-bold uppercase tracking-wide">What You Love</div>
            {paradox.lovedButIgnored.slice(0, 2).map((item) => (
              <div key={item.game.id} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg mb-1">
                {item.game.thumbnail ? (
                  <img src={item.game.thumbnail} alt={item.game.name} className="w-8 h-8 rounded object-cover shrink-0 opacity-40" loading="lazy" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 shrink-0 flex items-center justify-center">
                    <Gamepad2 size={12} className="text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60 truncate">{item.game.name}</div>
                  <div className="text-[10px] text-red-400/60">0h this week</div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-white/40">{item.rating}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Genre mismatch */}
      {paradox.topPlayedGenre && paradox.topRatedGenre && paradox.topPlayedGenre.genre !== paradox.topRatedGenre.genre && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 p-3 bg-white/[0.02] rounded-xl text-center"
        >
          <p className="text-xs text-white/30">
            Most played: <span className="text-violet-400">{paradox.topPlayedGenre.genre}</span> (avg {paradox.topPlayedGenre.avgRating.toFixed(1)}/10)
            {' · '}
            Highest rated: <span className="text-fuchsia-400">{paradox.topRatedGenre.genre}</span> (avg {paradox.topRatedGenre.avgRating.toFixed(1)}/10)
          </p>
        </motion.div>
      )}
    </div>
  );
}
