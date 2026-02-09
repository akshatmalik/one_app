'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthMoneyScreenProps {
  data: MonthInReviewData;
}

export function MonthMoneyScreen({ data }: MonthMoneyScreenProps) {
  const totalHoursFromPurchases = data.gamesPurchased.reduce((sum, g) => {
    const gp = data.gamesPlayed.find(gp => gp.game.id === g.game.id);
    return sum + (gp?.hours || 0);
  }, 0);
  const roi = data.totalSpent > 0 && totalHoursFromPurchases > 0
    ? (totalHoursFromPurchases / data.totalSpent).toFixed(1)
    : null;

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <DollarSign size={32} className="text-emerald-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2"
      >
        The Money Story
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="text-5xl font-black text-emerald-400 mb-2"
      >
        ${data.totalSpent.toFixed(0)}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-white/40 mb-6"
      >
        invested in {data.gamesPurchased.length} game{data.gamesPurchased.length !== 1 ? 's' : ''}
      </motion.div>

      {/* ROI stat */}
      {roi && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6"
        >
          <TrendingUp size={16} className="text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">{roi}h per dollar spent</span>
        </motion.div>
      )}

      {/* Purchases list */}
      <div className="space-y-2">
        {data.gamesPurchased.slice(0, 5).map((g, i) => (
          <motion.div
            key={g.game.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center justify-between text-sm px-4 py-2.5 bg-white/[0.03] rounded-xl"
          >
            <div className="flex items-center gap-2">
              {g.game.thumbnail && <img src={g.game.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />}
              <span className="text-white/70">{g.game.name}</span>
            </div>
            <span className="text-emerald-400 font-semibold">${g.price.toFixed(0)}</span>
          </motion.div>
        ))}
      </div>

      {data.bestDeal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 text-xs text-white/40"
        >
          Best deal: <span className="text-emerald-400 font-medium">{data.bestDeal.game.name}</span> at ${data.bestDeal.costPerHour.toFixed(2)}/hr
        </motion.div>
      )}
    </div>
  );
}
