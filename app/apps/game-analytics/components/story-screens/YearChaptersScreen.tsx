'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; chapterTitles?: Record<string, string>; }

const Q_COLORS = [
  { bar: 'bg-gradient-to-r from-blue-500 to-cyan-400', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { bar: 'bg-gradient-to-r from-emerald-500 to-teal-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { bar: 'bg-gradient-to-r from-amber-500 to-orange-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { bar: 'bg-gradient-to-r from-purple-500 to-pink-400', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
];

export function YearChaptersScreen({ data, chapterTitles }: Props) {
  const quarters = data.quarterBreakdown;
  const maxHours = Math.max(...quarters.map(q => q.hours), 1);
  const peakQ = quarters.reduce((a, b) => b.hours > a.hours ? b : a, quarters[0]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center"
      >
        The Four Chapters of {data.year}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center text-white/30 text-sm mb-8"
      >
        Your gaming year, told in quarters
      </motion.p>

      <div className="space-y-4">
        {quarters.map((q, i) => {
          const style = Q_COLORS[i];
          const pct = maxHours > 0 ? (q.hours / maxHours) * 100 : 0;
          const isPeak = q.quarter === peakQ.quarter;
          const qKey = `${data.year}-Q${q.quarter}`;
          const title = chapterTitles?.[qKey];

          return (
            <motion.div
              key={q.quarter}
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12, type: 'spring' }}
              className={`p-4 rounded-2xl border ${style.bg}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${style.text}`}>Q{q.quarter} {data.year}</span>
                    {isPeak && <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold">Peak</span>}
                  </div>
                  {title && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Sparkles size={10} className={style.text} />
                      <span className={`text-xs italic ${style.text} opacity-70`}>&ldquo;{title}&rdquo;</span>
                    </div>
                  )}
                </div>
                <span className={`text-xl font-black ${style.text}`}>{q.hours.toFixed(0)}h</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.7 }}
                  className={`h-full rounded-full ${style.bar}`}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                <span>{q.sessions} sessions</span>
                <span>{q.games} games</span>
                {q.completions > 0 && <span className="text-emerald-400">{q.completions} completed</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
