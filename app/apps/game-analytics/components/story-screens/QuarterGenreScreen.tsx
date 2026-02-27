'use client';

import { motion } from 'framer-motion';
import { QuarterInReviewData } from '../../lib/calculations';

interface Props { data: QuarterInReviewData; }

const GENRE_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6'];

export function QuarterGenreScreen({ data }: Props) {
  const genres = data.genreBreakdown.slice(0, 6);
  if (genres.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <p className="text-white/40">No genre data for this quarter</p>
      </div>
    );
  }

  const topGenre = genres[0];
  const isObsessed = topGenre.percentage > 70;

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 text-center"
      >
        Genre Supremacy
      </motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center mb-8"
      >
        <span className="text-2xl font-black text-white">{topGenre.genre}</span>
        <span className="text-white/40 text-sm ml-2">ruled {data.quarterLabel}</span>
      </motion.div>

      {/* Genre bars */}
      <div className="space-y-4 mb-8">
        {genres.map((g, i) => (
          <motion.div
            key={g.genre}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70 font-medium">{g.genre}</span>
              <span className="text-sm font-bold" style={{ color: GENRE_COLORS[i % GENRE_COLORS.length] }}>
                {g.percentage.toFixed(0)}% · {g.hours.toFixed(1)}h
              </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.percentage}%` }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.7 }}
                className="h-full rounded-full"
                style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Verdict */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center"
      >
        <p className="text-sm text-white/60">
          {isObsessed
            ? `You lived in ${topGenre.genre} this quarter — ${topGenre.percentage.toFixed(0)}% of all your hours. Everything else was a brief visit.`
            : `${topGenre.genre} led the charge at ${topGenre.percentage.toFixed(0)}%, but you kept it varied across ${genres.length} genres.`}
        </p>
      </motion.div>
    </div>
  );
}
