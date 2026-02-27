'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterVsLastScreen({ data }: Props) {
  const q = data.quarter;
  const prevQ = q === 1 ? `Q4 ${data.year - 1}` : `Q${q - 1} ${data.year}`;
  const vs = data.vsLastQuarter;

  const rows = [
    { label: 'Hours', diff: vs.hoursDiff, format: (v: number) => `${Math.abs(v).toFixed(1)}h` },
    { label: 'Sessions', diff: vs.sessionsDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Games', diff: vs.gamesDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Spending', diff: vs.spendingDiff, format: (v: number) => `$${Math.abs(v).toFixed(0)}` },
    { label: 'Completions', diff: vs.completionsDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
  ];

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-2"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-white/40">{data.quarterLabel} vs {prevQ}</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        {vs.trend === 'up' && <span className="text-emerald-400 font-bold text-sm">📈 A stronger quarter</span>}
        {vs.trend === 'down' && <span className="text-red-400 font-bold text-sm">📉 A quieter quarter</span>}
        {vs.trend === 'same' && <span className="text-white/40 font-bold text-sm">➡️ About the same pace</span>}
      </motion.div>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const isUp = row.diff > 0.5;
          const isDown = row.diff < -0.5;
          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5"
            >
              <span className="text-sm text-white/50 w-24 text-left">{row.label}</span>
              <div className="flex-1" />
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}>
                {isUp && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/15 rounded-full">
                    <TrendingUp size={13} className="text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400">+{row.format(row.diff)}</span>
                  </div>
                )}
                {isDown && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-500/15 rounded-full">
                    <TrendingDown size={13} className="text-red-400" />
                    <span className="text-sm font-bold text-red-400">-{row.format(row.diff)}</span>
                  </div>
                )}
                {!isUp && !isDown && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full">
                    <Minus size={13} className="text-white/40" />
                    <span className="text-sm font-bold text-white/40">same</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
