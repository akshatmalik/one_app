'use client';

import { motion } from 'framer-motion';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

export function QuarterMonthArcScreen({ data }: Props) {
  const max = Math.max(...data.monthBreakdown.map(m => m.hours), 1);
  const peakMonth = data.monthBreakdown.reduce((a, b) => b.hours > a.hours ? b : a, data.monthBreakdown[0]);
  const quietMonth = data.monthBreakdown.reduce((a, b) => b.hours < a.hours ? b : a, data.monthBreakdown[0]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center"
      >
        The Arc of {data.quarterLabel}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center text-white/30 text-sm mb-8"
      >
        How the quarter played out, month by month
      </motion.p>

      {/* Bars */}
      <div className="flex items-end justify-center gap-6 h-48 mb-6">
        {data.monthBreakdown.map((m, i) => {
          const pct = max > 0 ? (m.hours / max) * 100 : 0;
          const isPeak = m.monthKey === peakMonth.monthKey;
          return (
            <motion.div
              key={m.monthKey}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.6, type: 'spring' }}
              className="flex flex-col items-center gap-2"
              style={{ transformOrigin: 'bottom' }}
            >
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                className={`text-sm font-bold ${isPeak ? 'text-purple-400' : 'text-white/60'}`}
              >
                {m.hours.toFixed(0)}h
              </motion.div>
              <div
                className={`w-20 rounded-t-xl transition-all ${isPeak ? 'bg-gradient-to-t from-purple-600 to-purple-400' : 'bg-gradient-to-t from-white/10 to-white/20'}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              <div className={`text-sm font-bold ${isPeak ? 'text-purple-400' : 'text-white/50'}`}>{m.monthLabel}</div>
              <div className="text-[10px] text-white/25">{m.sessions} sessions</div>
              {isPeak && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                  className="text-xs px-2 py-0.5 bg-purple-500/20 rounded-full text-purple-300 font-semibold"
                >
                  Peak
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="text-center p-4 bg-white/[0.03] rounded-2xl border border-white/5"
      >
        {peakMonth.hours > 0 ? (
          <p className="text-sm text-white/60">
            <span className="text-white font-semibold">{peakMonth.monthLabel}</span> was your peak —{' '}
            <span className="text-purple-400 font-bold">{peakMonth.hours.toFixed(1)}h</span>
            {quietMonth.monthKey !== peakMonth.monthKey && quietMonth.hours < peakMonth.hours * 0.5 && (
              <span> vs {quietMonth.hours.toFixed(1)}h in {quietMonth.monthLabel}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-white/40">No activity recorded this quarter</p>
        )}
      </motion.div>
    </div>
  );
}
