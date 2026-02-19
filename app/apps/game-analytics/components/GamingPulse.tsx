'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Game } from '../lib/types';
import { getGamingPulseData, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface GamingPulseProps {
  games: Game[];
  className?: string;
}

export function GamingPulse({ games, className }: GamingPulseProps) {
  const { points, annotations, droughts } = useMemo(() => getGamingPulseData(games), [games]);

  // Aggregate to weekly for a cleaner chart if > 60 data points
  const chartData = useMemo(() => {
    if (points.length <= 60) {
      return points.map(p => ({
        date: p.date,
        displayDate: p.date.substring(5), // MM-DD
        hours: p.hours,
        dominantGame: p.dominantGame,
        color: p.dominantGameColor,
      }));
    }

    // Aggregate to weekly
    const weeks: { date: string; displayDate: string; hours: number; dominantGame: string; color: string }[] = [];
    let weekStart = points[0].date;
    let weekHours = 0;
    let weekGames: Record<string, { hours: number; color: string }> = {};

    points.forEach(p => {
      const daysDiff = Math.round(
        (parseLocalDate(p.date).getTime() - parseLocalDate(weekStart).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff >= 7) {
        // Close current week
        const topGame = Object.entries(weekGames).sort((a, b) => b[1].hours - a[1].hours)[0];
        weeks.push({
          date: weekStart,
          displayDate: weekStart.substring(5),
          hours: Math.round(weekHours * 10) / 10,
          dominantGame: topGame?.[0] || '',
          color: topGame?.[1].color || '#8b5cf6',
        });
        weekStart = p.date;
        weekHours = 0;
        weekGames = {};
      }

      weekHours += p.hours;
      if (!weekGames[p.dominantGame]) weekGames[p.dominantGame] = { hours: 0, color: p.dominantGameColor };
      weekGames[p.dominantGame].hours += p.hours;
    });

    // Final week
    if (weekHours > 0) {
      const topGame = Object.entries(weekGames).sort((a, b) => b[1].hours - a[1].hours)[0];
      weeks.push({
        date: weekStart,
        displayDate: weekStart.substring(5),
        hours: Math.round(weekHours * 10) / 10,
        dominantGame: topGame?.[0] || '',
        color: topGame?.[1].color || '#8b5cf6',
      });
    }

    return weeks;
  }, [points]);

  if (points.length < 3) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">Need more play sessions to show your gaming pulse</p>
      </div>
    );
  }

  // Stats
  const totalDroughtDays = droughts.reduce((s, d) => s + d.days, 0);
  const longestDrought = droughts.length > 0 ? Math.max(...droughts.map(d => d.days)) : 0;
  const completions = annotations.filter(a => a.type === 'completion');

  return (
    <div className={clsx('p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/50">Gaming Pulse</h3>
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          {droughts.length > 0 && (
            <span>{droughts.length} drought{droughts.length > 1 ? 's' : ''} ({longestDrought}d longest)</span>
          )}
          {completions.length > 0 && (
            <span>{completions.length} completion{completions.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,15,25,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.8)',
            }}
            formatter={(value: number) => [`${value}h`, 'Hours']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item?.dominantGame ? `${item.date} — ${item.dominantGame}` : label;
            }}
          />
          {/* Drought zones */}
          {droughts.map((d, i) => (
            <ReferenceLine
              key={i}
              x={d.start.substring(5)}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="3 3"
              label={{ value: `${d.days}d gap`, position: 'top', style: { fontSize: 8, fill: 'rgba(255,255,255,0.2)' } }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#8b5cf6"
            fill="url(#pulseGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#1a1a2e', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
