'use client';

import { Card } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Game } from '../lib/types';
import { getGameYear } from '../lib/calculations';

interface YearlyStatsChartProps {
  games: Game[];
}

interface YearData {
  year: string;
  spending: number;
  games: number;
  hours: number;
}

export function YearlyStatsChart({ games }: YearlyStatsChartProps) {
  const yearlyData: Record<number, YearData> = {};

  games.forEach(game => {
    const year = getGameYear(game);
    if (!yearlyData[year]) {
      yearlyData[year] = {
        year: year.toString(),
        spending: 0,
        games: 0,
        hours: 0,
      };
    }
    yearlyData[year].spending += game.price;
    yearlyData[year].games += 1;
    yearlyData[year].hours += game.hours;
  });

  const chartData = Object.values(yearlyData).sort((a, b) =>
    parseInt(a.year) - parseInt(b.year)
  );

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Year</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="spending" fill="#8B5CF6" name="Spending ($)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Games & Hours by Year</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip labelStyle={{ color: '#000' }} />
            <Legend />
            <Bar yAxisId="left" dataKey="games" fill="#10B981" name="Games" />
            <Bar yAxisId="right" dataKey="hours" fill="#3B82F6" name="Hours" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
