'use client';

import { motion } from 'framer-motion';
import { Trophy, Gamepad2 } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

export function YearCompletionWallScreen({ data }: Props) {
  const completed = data.completedGames;

  if (completed.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="text-7xl mb-6">📖</div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl font-black text-white/50 mb-3">
          Stories Left Open
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/30 text-sm">
          No completions in {data.year}. Sometimes the journey is more important than the destination.
        </motion.p>
        {data.newGamesStarted.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-white/20 text-xs mt-4">
            {data.newGamesStarted.length} adventures started — they carry into {data.year + 1}.
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-white/40">Completion Wall</div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-center mb-6">
        <span className="text-5xl font-black text-orange-400">{completed.length}</span>
        <span className="text-white/40 ml-2 text-lg">game{completed.length > 1 ? 's' : ''} conquered in {data.year}</span>
      </motion.div>

      {/* Trophy grid for smaller counts */}
      {completed.length <= 8 ? (
        <div className="space-y-2">
          {completed.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, type: 'spring' }}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/5 rounded-2xl border border-orange-500/15"
            >
              {game.thumbnail
                ? <img src={game.thumbnail} alt={game.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                : <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0"><Trophy size={18} className="text-orange-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{game.name}</div>
                {game.endDate && <div className="text-xs text-white/30">{new Date(game.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
              </div>
              {game.rating > 0 && <div className="text-sm font-black text-yellow-400 shrink-0">{game.rating}/10</div>}
              <Trophy size={14} className="text-orange-400 shrink-0" />
            </motion.div>
          ))}
        </div>
      ) : (
        /* Thumbnail grid for large counts */
        <div className="grid grid-cols-4 gap-2">
          {completed.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04, type: 'spring' }}
              className="relative aspect-square"
              title={game.name}
            >
              {game.thumbnail
                ? <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover rounded-xl" />
                : <div className="w-full h-full rounded-xl bg-orange-500/20 flex items-center justify-center"><Gamepad2 size={20} className="text-orange-400" /></div>
              }
              <div className="absolute top-1 right-1">
                <span className="text-xs">🏆</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
