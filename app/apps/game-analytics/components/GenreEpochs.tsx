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
} from 'recharts';
import { Game } from '../lib/types';
import { getGenreEpochsData } from '../lib/calculations';
import clsx from 'clsx';

interface GenreEpochsProps {
  games: Game[];
  className?: string;
}

export function GenreEpochs({ games, className }: GenreEpochsProps) {
  const { periods, eras } = useMemo(() => getGenreEpochsData(games), [games]);

  // Collect all genres across all periods
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    periods.forEach(p => p.bands.forEach(b => genreSet.add(b.genre)));
    return Array.from(genreSet);
  }, [periods]);

  // Transform data for Recharts stacked area: { period, RPG: 5.2, Action: 3.1, ... }
  const chartData = useMemo(() => {
    return periods.map(p => {
      const row: Record<string, string | number> = {
        period: p.period.substring(5), // "MM" for short display
        fullPeriod: p.period,
        periodLabel: p.periodLabel,
      };
      p.bands.forEach(b => {
        row[b.genre] = Math.round(b.hours * 10) / 10;
      });
      // Fill 0 for missing genres
      allGenres.forEach(g => {
        if (!(g in row)) row[g] = 0;
      });
      return row;
    });
  }, [periods, allGenres]);

  // Get color map
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    periods.forEach(p => {
      p.bands.forEach(b => {
        if (!map[b.genre]) map[b.genre] = b.color;
      });
    });
    return map;
  }, [periods]);

  if (periods.length < 2) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">Need at least 2 months of data for genre epochs</p>
      </div>
    );
  }

  return (
    <div className={clsx('p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl', className)}>
      <h3 className="text-sm font-medium text-white/50 mb-4">Genre Epochs</h3>

      {/* Eras */}
      {eras.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {eras.map((era, i) => (
            <div
              key={i}
              className="text-[10px] px-2 py-1 rounded-full border border-white/10"
              style={{ backgroundColor: (colorMap[era.genre] || '#6b7280') + '15', color: colorMap[era.genre] || '#6b7280' }}
            >
              {era.genre} era ({era.startPeriod} — {era.endPeriod}, ~{era.dominancePercent}%)
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'rgba(255,255,255,0.2)' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,15,25,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.8)',
            }}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item?.periodLabel || label;
            }}
            formatter={(value: number, name: string) => [`${value}h`, name]}
          />
          {allGenres.map(genre => (
            <Area
              key={genre}
              type="monotone"
              dataKey={genre}
              stackId="1"
              fill={colorMap[genre] || '#6b7280'}
              stroke={colorMap[genre] || '#6b7280'}
              fillOpacity={0.6}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {allGenres.map(genre => (
          <div key={genre} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorMap[genre] || '#6b7280' }} />
            <span className="text-[10px] text-white/40">{genre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
