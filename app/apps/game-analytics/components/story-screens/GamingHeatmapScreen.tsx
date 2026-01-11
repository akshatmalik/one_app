'use client';

import { motion } from 'framer-motion';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface GamingHeatmapScreenProps {
  data: WeekInReviewData;
}

export function GamingHeatmapScreen({ data }: GamingHeatmapScreenProps) {
  const maxHours = Math.max(...data.dailyHours.map(d => d.hours), 1);

  // Calculate intensity color
  const getIntensityColor = (hours: number) => {
    const intensity = hours / maxHours;
    if (intensity === 0) return 'bg-white/5 border-white/10';
    if (intensity < 0.25) return 'bg-blue-500/20 border-blue-500/30';
    if (intensity < 0.5) return 'bg-cyan-500/30 border-cyan-500/40';
    if (intensity < 0.75) return 'bg-purple-500/40 border-purple-500/50';
    return 'bg-pink-500/50 border-pink-500/60';
  };

  const getIntensityEmoji = (hours: number) => {
    const intensity = hours / maxHours;
    if (intensity === 0) return '💤';
    if (intensity < 0.25) return '🔵';
    if (intensity < 0.5) return '🌊';
    if (intensity < 0.75) return '🔥';
    return '💥';
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full mb-3 backdrop-blur-sm border border-orange-500/30">
          <Flame size={18} className="text-orange-300" />
          <span className="text-orange-200 font-bold uppercase tracking-wide text-sm">Heat Map</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Gaming Intensity
        </h2>
        <p className="text-white/50 mt-2">Your week at a glance</p>
      </motion.div>

      {/* Heatmap Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-7 gap-3">
          {data.dailyHours.map((day, index) => {
            const intensity = day.hours / maxHours;

            return (
              <motion.div
                key={day.day}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.1 + 0.3,
                  type: 'spring',
                  bounce: 0.4,
                }}
                className="flex flex-col items-center"
              >
                {/* Day name */}
                <div className="text-xs text-white/40 mb-2 font-medium">
                  {day.day.slice(0, 3)}
                </div>

                {/* Heatmap cell */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-full aspect-square rounded-xl border-2 ${getIntensityColor(day.hours)}
                    flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer`}
                >
                  {/* Glow effect for high intensity */}
                  {intensity > 0.6 && (
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 bg-gradient-to-t from-pink-500/30 to-purple-500/30 blur-xl"
                    />
                  )}

                  {/* Emoji */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.5, type: 'spring' }}
                    className="text-2xl relative z-10"
                  >
                    {getIntensityEmoji(day.hours)}
                  </motion.div>

                  {/* Hours */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.6 }}
                    className="text-white font-bold text-xs relative z-10"
                  >
                    {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '-'}
                  </motion.div>
                </motion.div>

                {/* Sessions count */}
                {day.sessions > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.7 }}
                    className="text-xs text-white/30 mt-1"
                  >
                    {day.sessions}x
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10"
      >
        <div className="text-xs text-white/40 mb-3 text-center">Intensity Scale</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-white/30">Less</span>
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-white/5 border border-white/10" />
            <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30" />
            <div className="w-6 h-6 rounded bg-cyan-500/30 border border-cyan-500/40" />
            <div className="w-6 h-6 rounded bg-purple-500/40 border border-purple-500/50" />
            <div className="w-6 h-6 rounded bg-pink-500/50 border border-pink-500/60" />
          </div>
          <span className="text-xs text-white/30">More</span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="p-5 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl border border-orange-500/30 text-center"
        >
          <TrendingUp size={24} className="mx-auto mb-2 text-orange-300" />
          <div className="text-3xl font-black text-orange-300 mb-1">
            {data.longestStreak}
          </div>
          <div className="text-white/70 text-sm">Day Streak</div>
          <div className="text-white/40 text-xs mt-1">
            {data.longestStreak === 7 ? '🏆 Perfect!' : 'Consecutive days'}
          </div>
        </motion.div>

        {/* Active Days */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="p-5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-500/30 text-center"
        >
          <Calendar size={24} className="mx-auto mb-2 text-blue-300" />
          <div className="text-3xl font-black text-blue-300 mb-1">
            {data.daysActive}/7
          </div>
          <div className="text-white/70 text-sm">Active Days</div>
          <div className="text-white/40 text-xs mt-1">
            {data.perfectWeek ? '✨ Perfect week!' : `${7 - data.daysActive} rest day${7 - data.daysActive !== 1 ? 's' : ''}`}
          </div>
        </motion.div>
      </div>

      {/* Pattern Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
        className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 text-center"
      >
        <p className="text-white/70 text-sm">
          {data.weekendWarrior && '🎮 Weekend Warrior! Most gaming on Sat/Sun'}
          {data.weekdayGrind && '💼 Weekday Grinder! Gaming after work/school'}
          {!data.weekendWarrior && !data.weekdayGrind &&
            `🌟 Balanced player! ${data.weekendPercentage.toFixed(0)}% weekend, ${data.weekdayPercentage.toFixed(0)}% weekday`
          }
        </p>
      </motion.div>
    </div>
  );
}
