'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

interface DailyActivityChartProps {
  dailyData: Array<{
    day: string;
    hours: number;
    sessions: number;
    games: number;
    gameNames: string[];
  }>;
  busiestDay: string | null;
}

export function DailyActivityChart({ dailyData, busiestDay }: DailyActivityChartProps) {
  const maxHours = Math.max(...dailyData.map(d => d.hours), 1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2a2a3a] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.day}</p>
          <div className="space-y-1 text-sm">
            <p className="text-purple-400">{data.hours.toFixed(1)} hours</p>
            <p className="text-white/60">{data.sessions} sessions</p>
            <p className="text-white/60">{data.games} game{data.games !== 1 ? 's' : ''}</p>
            {data.gameNames.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-white/40 text-xs mb-1">Games:</p>
                {data.gameNames.slice(0, 3).map((name: string, i: number) => (
                  <p key={i} className="text-white/60 text-xs truncate">• {name}</p>
                ))}
                {data.gameNames.length > 3 && (
                  <p className="text-white/40 text-xs">+{data.gameNames.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (day: string, hours: number) => {
    if (hours === 0) return '#1f1f2e';
    if (day === busiestDay) return '#8b5cf6'; // Purple for busiest
    if (hours >= maxHours * 0.7) return '#6366f1'; // Blue for high
    if (hours >= maxHours * 0.4) return '#06b6d4'; // Cyan for medium
    return '#3b82f6'; // Light blue for low
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: '#ffffff60', fontSize: 12 }}
            axisLine={{ stroke: '#ffffff10' }}
          />
          <YAxis
            tick={{ fill: '#ffffff40', fontSize: 12 }}
            axisLine={{ stroke: '#ffffff10' }}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
            {dailyData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.day, entry.hours)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        {busiestDay && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-white/60">Busiest Day</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1f1f2e] border border-white/10" />
          <span className="text-white/60">Rest Day</span>
        </div>
      </div>
    </div>
  );
}
