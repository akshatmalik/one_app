'use client';

import { Game } from '../lib/types';
import { getAllPlayLogs, getCurrentGamingStreak, parseLocalDate } from '../lib/calculations';
import { Flame, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface GamingHeatmapProps {
  games: Game[];
}

export function GamingHeatmap({ games }: GamingHeatmapProps) {
  const currentStreak = getCurrentGamingStreak(games);
  const allLogs = getAllPlayLogs(games);

  // Build a map of date -> hours played
  const dateHoursMap: Record<string, number> = {};
  allLogs.forEach(({ log }) => {
    dateHoursMap[log.date] = (dateHoursMap[log.date] || 0) + log.hours;
  });

  // Get last 12 weeks (84 days) for heatmap
  const today = new Date();
  const days: Array<{ date: string; hours: number; dayOfWeek: number }> = [];

  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      hours: dateHoursMap[dateStr] || 0,
      dayOfWeek: date.getDay(), // 0 = Sunday
    });
  }

  // Group by week
  const weeks: Array<Array<{ date: string; hours: number; dayOfWeek: number }>> = [];
  let currentWeek: Array<{ date: string; hours: number; dayOfWeek: number }> = [];

  // Pad the beginning to start on Sunday
  const firstDayOfWeek = days[0].dayOfWeek;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', hours: 0, dayOfWeek: i });
  }

  days.forEach(day => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) { // Saturday - end of week
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', hours: 0, dayOfWeek: currentWeek.length });
    }
    weeks.push(currentWeek);
  }

  // Get intensity color based on hours
  const getIntensityColor = (hours: number) => {
    if (hours === 0) return 'bg-white/5';
    if (hours < 1) return 'bg-emerald-500/20';
    if (hours < 3) return 'bg-emerald-500/40';
    if (hours < 5) return 'bg-emerald-500/60';
    if (hours < 8) return 'bg-emerald-500/80';
    return 'bg-emerald-500';
  };

  const getTotalHours = () => {
    return Object.values(dateHoursMap).reduce((sum, h) => sum + h, 0);
  };

  const getActiveDays = () => {
    return Object.keys(dateHoursMap).length;
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  if (allLogs.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Gaming Activity</h3>
          <span className="text-xs text-white/40">Last 12 weeks</span>
        </div>
        {currentStreak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 rounded-lg">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs text-orange-400 font-medium">{currentStreak} day streak!</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">{getTotalHours().toFixed(0)}h</div>
          <div className="text-xs text-white/40">total hours</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-cyan-400">{getActiveDays()}</div>
          <div className="text-xs text-white/40">active days</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-blue-400">{(getTotalHours() / 84).toFixed(1)}h</div>
          <div className="text-xs text-white/40">avg/day</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-3" /> {/* Spacer for month labels */}
            {dayLabels.map((label, idx) => (
              <div key={idx} className="h-3 w-3 flex items-center justify-center">
                <span className="text-[8px] text-white/30">{label}</span>
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {/* Month label (show on first week of month) */}
              <div className="h-3 flex items-center justify-center text-[8px] text-white/30">
                {week[0]?.date && parseLocalDate(week[0].date).getDate() <= 7
                  ? parseLocalDate(week[0].date).toLocaleDateString('en', { month: 'short' })
                  : ''}
              </div>

              {/* Days */}
              {week.map((day, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={clsx(
                    'h-3 w-3 rounded-sm transition-all cursor-pointer hover:ring-1 hover:ring-white/30',
                    day.date ? getIntensityColor(day.hours) : 'bg-transparent'
                  )}
                  title={day.date ? `${day.date}: ${day.hours.toFixed(1)}h` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Less</span>
          <div className="flex gap-1">
            {[0, 1, 3, 5, 8].map((hours, idx) => (
              <div
                key={idx}
                className={clsx('h-3 w-3 rounded-sm', getIntensityColor(hours))}
                title={`${hours}+ hours`}
              />
            ))}
          </div>
          <span className="text-xs text-white/40">More</span>
        </div>
        <div className="text-xs text-white/30">
          Hover for details
        </div>
      </div>
    </div>
  );
}
