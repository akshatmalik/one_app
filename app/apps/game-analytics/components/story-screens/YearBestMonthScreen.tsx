'use client';

import { motion } from 'framer-motion';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

export function YearBestMonthScreen({ data }: Props) {
  const peak = data.peakMonth;
  const months = data.monthBreakdown;
  const maxHours = Math.max(...months.map(m => m.hours), 1);

  if (!peak || peak.hours === 0) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 text-lg">No monthly data available</motion.p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center">
        Peak Month of {data.year}
      </motion.h2>

      {/* Peak month hero */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 mb-6"
      >
        <div className="text-5xl font-black text-amber-400 mb-1">{peak.monthLabel}</div>
        <div className="text-7xl font-black text-white mb-2">{peak.hours.toFixed(0)}h</div>
        <div className="text-sm text-white/40">{((peak.hours / (data.totalHours || 1)) * 100).toFixed(0)}% of your entire year in one month</div>
      </motion.div>

      {/* All 12 months bar chart */}
      <div className="flex items-end gap-1 h-20 mb-2">
        {months.map((m, i) => {
          const pct = (m.hours / maxHours) * 100;
          const isPeak = m.monthKey === peak.monthKey;
          return (
            <motion.div
              key={m.monthKey}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.04, type: 'spring' }}
              style={{ height: `${Math.max(pct, 4)}%`, transformOrigin: 'bottom' }}
              className={`flex-1 rounded-t-md ${isPeak ? 'bg-amber-400' : 'bg-white/15'}`}
              title={`${m.monthLabel}: ${m.hours.toFixed(0)}h`}
            />
          );
        })}
      </div>
      <div className="flex gap-1">
        {months.map(m => (
          <div key={m.monthKey} className="flex-1 text-center text-[9px] text-white/25">{m.monthLabel[0]}</div>
        ))}
      </div>
    </div>
  );
}
