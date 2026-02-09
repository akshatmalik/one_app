'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthGenreScreenProps {
  data: MonthInReviewData;
}

export function MonthGenreScreen({ data }: MonthGenreScreenProps) {
  const genres = data.genreBreakdown.slice(0, 6);
  const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444'];

  // Calculate donut segments
  let cumulativeAngle = 0;
  const segments = genres.map((g, i) => {
    const angle = (g.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...g, startAngle, angle, color: colors[i % colors.length] };
  });

  // SVG donut
  const cx = 80, cy = 80, r = 60, strokeWidth = 20;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6"
      >
        Genre Split
      </motion.div>

      {/* Donut chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex justify-center mb-8"
      >
        <svg width={160} height={160} viewBox="0 0 160 160">
          {segments.map((seg, i) => {
            const dashLength = (seg.percentage / 100) * circumference;
            const dashOffset = -(segments.slice(0, i).reduce((s, ss) => s + (ss.percentage / 100) * circumference, 0));
            return (
              <motion.circle
                key={seg.genre}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.15 }}
              />
            );
          })}
          <text x={cx} y={cy - 5} textAnchor="middle" className="fill-white text-lg font-bold">{data.uniqueGames}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-white/40 text-[10px]">games</text>
        </svg>
      </motion.div>

      {/* Legend */}
      <div className="space-y-2">
        {genres.map((g, i) => (
          <motion.div
            key={g.genre}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-sm text-white/60 flex-1 text-left">{g.genre}</span>
            <span className="text-sm font-bold" style={{ color: colors[i % colors.length] }}>{g.percentage.toFixed(0)}%</span>
            <span className="text-xs text-white/30 w-12 text-right">{g.hours.toFixed(1)}h</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
