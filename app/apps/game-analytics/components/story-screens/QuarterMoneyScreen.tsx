'use client';

import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, Star, TrendingDown } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterMoneyScreen({ data }: Props) {
  if (data.totalSpent === 0 && data.gamesPurchased.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl mb-6">💸</motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-2xl font-black text-white/60 mb-2">No Purchases</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/30 text-sm">
          You played what you had in {data.quarterLabel}. The backlog is grateful.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center"
      >
        Spending Report · {data.quarterLabel}
      </motion.h2>

      {/* Hero spend */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-3 px-8 py-5 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
          <DollarSign size={28} className="text-emerald-400" />
          <div>
            <div className="text-5xl font-black text-emerald-400">${data.totalSpent.toFixed(0)}</div>
            <div className="text-xs text-white/40 mt-1">total spent · {data.gamesPurchased.length} purchase{data.gamesPurchased.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </motion.div>

      {/* Purchases list */}
      {data.gamesPurchased.length > 0 && (
        <div className="space-y-2 mb-6">
          {data.gamesPurchased.slice(0, 5).map((p, i) => (
            <motion.div
              key={p.game.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
            >
              {p.game.thumbnail
                ? <img src={p.game.thumbnail} alt={p.game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><ShoppingBag size={16} className="text-white/20" /></div>
              }
              <span className="flex-1 text-sm text-white/70 truncate">{p.game.name}</span>
              <span className="text-sm font-bold text-emerald-400 shrink-0">${p.price.toFixed(0)}</span>
            </motion.div>
          ))}
          {data.gamesPurchased.length > 5 && (
            <p className="text-center text-xs text-white/30">+{data.gamesPurchased.length - 5} more</p>
          )}
        </div>
      )}

      {/* Best deal */}
      {data.bestDeal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <Star size={18} className="text-yellow-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Best Deal</div>
            <div className="text-sm text-white/70 truncate">{data.bestDeal.game.name}</div>
          </div>
          <div className="text-sm font-black text-yellow-400">${data.bestDeal.costPerHour.toFixed(2)}/hr</div>
        </motion.div>
      )}
    </div>
  );
}
