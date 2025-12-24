'use client';

import { Card } from '@/components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { GameWithMetrics } from '../hooks/useAnalytics';

interface BlendScoreChartProps {
  games: GameWithMetrics[];
}

export function BlendScoreChart({ games }: BlendScoreChartProps) {
  const data = [...games]
    .sort((a, b) => b.metrics.blendScore - a.metrics.blendScore)
    .slice(0, 10)
    .map(game => ({
      name: game.name,
      blendScore: parseFloat(game.metrics.blendScore.toFixed(1)),
      rating: game.rating,
      costPerHour: parseFloat(game.metrics.costPerHour.toFixed(2)),
    }));

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">No games to display</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Games by Blend Score</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="blendScore" fill="#8B5CF6" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
