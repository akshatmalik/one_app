'use client';

import { motion } from 'framer-motion';
import { Trophy, Gamepad2, Flame } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterCompletionsScreen({ data }: Props) {
  const hasCompletions = data.completedGames.length > 0;

  if (!hasCompletions) {
    return (
      <div className="w-full max-w-lg mx-auto text-center flex flex-col items-center justify-center min-h-[50vh]">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Gamepad2 size={40} className="text-white/20" />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl font-black text-white/60 mb-3">
          The Unfinished Chapter
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/30 text-sm">
          No completions in {data.quarterLabel}. Stories left untold.
        </motion.p>
        {data.newGamesStarted.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-white/20 text-xs mt-4">
            {data.newGamesStarted.length} new adventures started though — they&apos;re coming.
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-2"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-white/40">Completion Hall</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <span className="text-4xl font-black text-orange-400">{data.completedGames.length}</span>
        <span className="text-white/40 ml-2">game{data.completedGames.length > 1 ? 's' : ''} finished in {data.quarterLabel}</span>
      </motion.div>

      <div className="space-y-3">
        {data.completedGames.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
            className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/5 rounded-2xl border border-orange-500/20"
          >
            {game.thumbnail ? (
              <img src={game.thumbnail} alt={game.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Trophy size={20} className="text-orange-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate">{game.name}</div>
              {game.endDate && (
                <div className="text-xs text-white/30 mt-0.5">
                  Completed {new Date(game.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
            {game.rating > 0 && (
              <div className="text-sm font-black text-yellow-400 shrink-0">{game.rating}/10</div>
            )}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
            >
              <Trophy size={16} className="text-orange-400 shrink-0" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {data.completedGames.length >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-5 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/20">
            <Flame size={14} className="text-orange-400" />
            <span className="text-sm text-orange-300 font-semibold">Productive quarter</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
