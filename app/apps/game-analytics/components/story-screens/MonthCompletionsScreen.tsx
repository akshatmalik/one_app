'use client';

import { motion } from 'framer-motion';
import { Trophy, Rocket } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthCompletionsScreenProps {
  data: MonthInReviewData;
}

export function MonthCompletionsScreen({ data }: MonthCompletionsScreenProps) {
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto">
          <Trophy size={32} className="text-yellow-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        Milestones
      </motion.div>

      {/* Completed games */}
      {data.completedGames.length > 0 && (
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium mb-3"
          >
            <Trophy size={12} />
            Completed
          </motion.div>
          {data.completedGames.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.15, type: 'spring' }}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 rounded-xl mb-2 border border-emerald-500/10"
            >
              {g.thumbnail && <img src={g.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div className="flex-1 text-left">
                <span className="text-white font-semibold">{g.name}</span>
                {g.genre && <div className="text-xs text-white/30">{g.genre}</div>}
              </div>
              {g.rating > 0 && (
                <span className="text-sm text-yellow-400 font-bold">{g.rating}/10</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* New starts */}
      {data.newGamesStarted.length > 0 && (
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium mb-3"
          >
            <Rocket size={12} />
            Started
          </motion.div>
          {data.newGamesStarted.slice(0, 4).map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl mb-2 border border-blue-500/10"
            >
              {g.thumbnail && <img src={g.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <span className="text-white font-medium">{g.name}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
