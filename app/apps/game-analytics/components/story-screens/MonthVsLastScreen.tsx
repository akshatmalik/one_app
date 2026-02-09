'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthVsLastScreenProps {
  data: MonthInReviewData;
}

export function MonthVsLastScreen({ data }: MonthVsLastScreenProps) {
  const items = [
    { label: 'Hours', diff: data.vsLastMonth.hoursDiff, format: (v: number) => `${Math.abs(v).toFixed(1)}h` },
    { label: 'Sessions', diff: data.vsLastMonth.sessionsDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Games', diff: data.vsLastMonth.gamesDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Spending', diff: data.vsLastMonth.spendingDiff, format: (v: number) => `$${Math.abs(v).toFixed(0)}` },
  ];

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8"
      >
        vs Last Month
      </motion.div>

      <div className="space-y-4">
        {items.map((item, i) => {
          const isUp = item.diff > 0.5;
          const isDown = item.diff < -0.5;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
              className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5"
            >
              <span className="text-sm text-white/50 w-20 text-left">{item.label}</span>

              <div className="flex-1" />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.12, type: 'spring' }}
                className="flex items-center gap-2"
              >
                {isUp && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/15 rounded-full">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400">+{item.format(item.diff)}</span>
                  </div>
                )}
                {isDown && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-500/15 rounded-full">
                    <TrendingDown size={14} className="text-red-400" />
                    <span className="text-sm font-bold text-red-400">-{item.format(item.diff)}</span>
                  </div>
                )}
                {!isUp && !isDown && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full">
                    <Minus size={14} className="text-white/40" />
                    <span className="text-sm font-bold text-white/40">same</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Overall trend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-6"
      >
        {data.vsLastMonth.trend === 'up' && (
          <span className="text-sm text-emerald-400">📈 More active than last month</span>
        )}
        {data.vsLastMonth.trend === 'down' && (
          <span className="text-sm text-red-400">📉 Quieter than last month</span>
        )}
        {data.vsLastMonth.trend === 'same' && (
          <span className="text-sm text-white/40">➡️ About the same pace</span>
        )}
      </motion.div>
    </div>
  );
}
