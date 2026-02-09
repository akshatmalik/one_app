'use client';

import { motion } from 'framer-motion';
import { Layers, Star, Gamepad2 } from 'lucide-react';
import { FranchiseCheckIn } from '../../lib/calculations';

interface FranchiseCheckInScreenProps {
  checkIns: FranchiseCheckIn[];
}

export function FranchiseCheckInScreen({ checkIns }: FranchiseCheckInScreenProps) {
  if (checkIns.length === 0) return null;
  const franchise = checkIns[0]; // Show the primary franchise

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full mb-3 backdrop-blur-sm border border-indigo-500/30">
          <Layers size={18} className="text-indigo-300" />
          <span className="text-indigo-200 font-bold uppercase tracking-wide text-sm">Franchise Check-in</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Your {franchise.franchise} Journey
        </h2>
        <p className="text-white/40 text-sm mt-1">
          {franchise.games.length} games · {franchise.totalHours.toFixed(1)}h total · {franchise.ratingTrend}
        </p>
      </motion.div>

      <div className="space-y-2">
        {franchise.games.map((entry, index) => (
          <motion.div
            key={entry.game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              entry.playedThisWeek
                ? 'bg-indigo-500/10 border-indigo-500/20'
                : 'bg-white/[0.02] border-white/5'
            }`}
          >
            {entry.game.thumbnail ? (
              <img
                src={entry.game.thumbnail}
                alt={entry.game.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                <Gamepad2 size={16} className="text-white/20" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/80 truncate">{entry.game.name}</span>
                {entry.playedThisWeek && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-medium shrink-0">
                    This week
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>{entry.hours.toFixed(1)}h</span>
                <span>·</span>
                <span>{entry.status}</span>
              </div>
            </div>

            {entry.rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-white/60">{entry.rating}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
