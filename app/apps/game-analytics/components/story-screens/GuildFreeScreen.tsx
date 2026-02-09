'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { WeekInReviewData, getEntertainmentComparison } from '../../lib/calculations';

interface GuildFreeScreenProps {
  data: WeekInReviewData;
}

export function GuildFreeScreen({ data }: GuildFreeScreenProps) {
  const comparison = getEntertainmentComparison(data.totalCostPerHour, data.totalHours);
  const maxCost = Math.max(...comparison.comparisons.map(c => c.costPerHour), 1);

  if (data.totalCostPerHour <= 0) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center px-4">
        <Shield size={48} className="mx-auto mb-4 text-purple-400" />
        <h2 className="text-3xl font-bold text-white mb-2">Guilt-Free Gaming</h2>
        <p className="text-white/50">Play some paid games to see how gaming compares to other entertainment!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full mb-3 backdrop-blur-sm border border-emerald-500/30">
          <Shield size={18} className="text-emerald-300" />
          <span className="text-emerald-200 font-bold uppercase tracking-wide text-sm">Guilt-Free Gaming</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Entertainment Value
        </h2>
      </motion.div>

      {/* Bar chart */}
      <div className="space-y-3 mb-6">
        {comparison.comparisons.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-24 text-right text-sm text-white/70 font-medium shrink-0">
              {item.name}
            </div>
            <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.costPerHour / maxCost) * 100}%` }}
                transition={{ delay: index * 0.1 + 0.5, duration: 0.6 }}
                className="h-full rounded-lg flex items-center justify-end pr-2"
                style={{ backgroundColor: item.isGaming ? '#8b5cf6' : `${item.color}80` }}
              >
                {(item.costPerHour / maxCost) * 100 > 20 && (
                  <span className="text-xs font-bold text-white">${item.costPerHour.toFixed(2)}/hr</span>
                )}
              </motion.div>
              {(item.costPerHour / maxCost) * 100 <= 20 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">
                  ${item.costPerHour.toFixed(2)}/hr
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Headline */}
      {comparison.cheapestVs && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="p-5 bg-gradient-to-br from-purple-500/20 to-emerald-500/20 rounded-2xl border border-purple-500/30 text-center"
        >
          <div className="text-3xl font-black text-emerald-400 mb-2">
            {comparison.cheapestVs.multiplier}x cheaper
          </div>
          <p className="text-white/60 text-sm">
            than {comparison.cheapestVs.name.toLowerCase()}. You saved ${comparison.savedVsMovies.toFixed(0)} vs equivalent movie hours this week.
          </p>
        </motion.div>
      )}

      {/* Best game callout */}
      {data.bestValueGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-3 p-3 bg-white/[0.03] rounded-xl text-center"
        >
          <p className="text-xs text-white/40">
            Best game: <span className="text-purple-400 font-medium">{data.bestValueGame.game.name}</span> at ${data.bestValueGame.costPerHour.toFixed(2)}/hr
          </p>
        </motion.div>
      )}
    </div>
  );
}
