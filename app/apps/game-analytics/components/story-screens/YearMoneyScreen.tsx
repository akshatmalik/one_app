'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Star, AlertTriangle } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

export function YearMoneyScreen({ data }: Props) {
  const costPerHour = data.totalHours > 0 && data.totalSpent > 0 ? data.totalSpent / data.totalHours : 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center">
        {data.year} Money Report
      </motion.h2>

      {/* Hero spend */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 mb-6"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-400/60 mb-2">Total Invested</div>
        <div className="text-6xl font-black text-emerald-400">${data.totalSpent.toFixed(0)}</div>
        <div className="text-sm text-white/40 mt-2">across {data.gamesPurchased.length} games · ${data.avgPurchasePrice.toFixed(0)} avg</div>
        {costPerHour > 0 && (
          <div className="text-sm text-emerald-400/70 mt-1">${costPerHour.toFixed(2)}/hr overall value</div>
        )}
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.totalSaved > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-blue-400" /><span className="text-xs text-blue-400 font-bold">Saved</span></div>
            <div className="text-2xl font-black text-blue-400">${data.totalSaved.toFixed(0)}</div>
            <div className="text-xs text-white/30">via deals & subs</div>
          </motion.div>
        )}
        {data.bestValueGame && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
          >
            <div className="flex items-center gap-2 mb-1"><Star size={14} className="text-yellow-400" /><span className="text-xs text-yellow-400 font-bold">Best Value</span></div>
            <div className="text-sm font-black text-yellow-400 truncate">{data.bestValueGame.game.name}</div>
            <div className="text-xs text-white/30">${data.bestValueGame.costPerHour.toFixed(2)}/hr</div>
          </motion.div>
        )}
      </div>

      {/* Worst value */}
      {data.worstValueGame && data.worstValueGame.game.id !== data.bestValueGame?.game.id && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-red-500/8 border border-red-500/15"
        >
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-red-400 font-bold">Most Expensive Per Hour</div>
            <div className="text-sm text-white/60 truncate">{data.worstValueGame.game.name}</div>
          </div>
          <div className="text-sm font-black text-red-400">${data.worstValueGame.costPerHour.toFixed(2)}/hr</div>
        </motion.div>
      )}
    </div>
  );
}
