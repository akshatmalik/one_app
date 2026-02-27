'use client';

import { motion } from 'framer-motion';
import { YearInReviewFullData } from '../../lib/calculations';

interface Props { data: YearInReviewFullData; }

const COLORS = ['#f59e0b', '#a78bfa', '#60a5fa', '#34d399', '#f97316', '#ec4899', '#8b5cf6'];

export function YearGenreScreen({ data }: Props) {
  const genres = data.genreBreakdown.slice(0, 6);
  if (genres.length === 0) return null;

  const top = genres[0];
  const isObsessed = top.percentage > 60;
  const totalOther = 100 - genres.reduce((s, g) => s + g.percentage, 0);

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center">
        Genre DNA of {data.year}
      </motion.h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-center mb-8">
        <span className="text-3xl font-black text-white">{top.genre}</span>
        <span className="text-white/40 ml-2">dominated your {data.year}</span>
      </motion.div>

      <div className="space-y-4 mb-8">
        {genres.map((g, i) => (
          <motion.div key={g.genre} initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70 font-medium">{g.genre}</span>
              <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                {g.percentage.toFixed(0)}% · {g.hours.toFixed(0)}h
              </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.percentage}%` }}
                transition={{ delay: 0.4 + i * 0.09, duration: 0.7 }}
                className="h-full rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
          </motion.div>
        ))}
        {totalOther > 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-white/30">Other genres</span>
              <span className="text-sm text-white/30">{totalOther.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-white/15" style={{ width: `${totalOther}%` }} />
            </div>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
        className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center"
      >
        <p className="text-sm text-white/60">
          {isObsessed
            ? `${top.genre} wasn't just your favourite — it was your identity in ${data.year}. ${top.percentage.toFixed(0)}% of all hours.`
            : `${genres.length} genres explored. You kept it varied in ${data.year}.`}
        </p>
      </motion.div>
    </div>
  );
}
