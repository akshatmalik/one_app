'use client';

import { motion } from 'framer-motion';
import { MonthInReviewData } from '../../lib/calculations';

interface MonthCalendarScreenProps {
  data: MonthInReviewData;
}

export function MonthCalendarScreen({ data }: MonthCalendarScreenProps) {
  const maxHours = Math.max(...data.dailyHours.map(d => d.hours), 1);
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const firstDayOfWeek = new Date(data.year, data.month - 1, 1).getDay();

  // Build calendar grid
  const cells: Array<{ day: number; hours: number } | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = data.dailyHours.find(dh => dh.date === dateStr);
    cells.push({ day: d, hours: entry?.hours || 0 });
  }

  // Find streak days for highlighting
  const activeDates = new Set(data.dailyHours.map(d => d.date));

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2"
      >
        Activity Calendar
      </motion.div>

      {data.longestStreak > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-orange-400 mb-4"
        >
          🔥 {data.longestStreak}-day streak
        </motion.div>
      )}

      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-white/30 text-center py-1 font-medium">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.015, duration: 0.3 }}
            className="aspect-square rounded-lg flex items-center justify-center text-[11px] relative"
            style={{
              backgroundColor: cell
                ? cell.hours > 0
                  ? `rgba(139, 92, 246, ${0.15 + (cell.hours / maxHours) * 0.85})`
                  : 'rgba(255,255,255,0.02)'
                : 'transparent',
            }}
          >
            {cell && (
              <span className={cell.hours > 0 ? 'text-white/90 font-semibold' : 'text-white/15'}>
                {cell.day}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex justify-between items-center text-xs text-white/30 px-2"
      >
        <span>{data.daysActive} active days</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500/20" />
          <span>less</span>
          <div className="w-3 h-3 rounded bg-purple-500/60" />
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>more</span>
        </div>
      </motion.div>
    </div>
  );
}
