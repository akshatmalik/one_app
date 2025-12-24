'use client';

import { Card } from '@/components/ui/Card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { GameWithMetrics } from '../hooks/useAnalytics';

interface AnalysisChartsProps {
  games: GameWithMetrics[];
}

const STATUS_COLORS = {
  'Completed': '#10B981',
  'In Progress': '#F59E0B',
  'Not Started': '#6B7280',
};

const RATING_COLORS = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];

export function AnalysisCharts({ games }: AnalysisChartsProps) {
  if (games.length === 0) return null;

  // Rating Distribution
  const ratingDistribution = Array.from({ length: 10 }, (_, i) => ({
    rating: `${i + 1}`,
    count: games.filter(g => Math.floor(g.rating) === i + 1).length,
  }));

  // Status Breakdown
  const statusBreakdown = [
    { name: 'Completed', value: games.filter(g => g.status === 'Completed').length, color: STATUS_COLORS['Completed'] },
    { name: 'In Progress', value: games.filter(g => g.status === 'In Progress').length, color: STATUS_COLORS['In Progress'] },
    { name: 'Not Started', value: games.filter(g => g.status === 'Not Started').length, color: STATUS_COLORS['Not Started'] },
  ].filter(item => item.value > 0);

  // Cost Efficiency Scatter (Rating vs Cost per Hour)
  const efficiencyData = games.map(g => ({
    name: g.name,
    rating: g.rating,
    costPerHour: g.metrics.costPerHour,
    hours: g.hours,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rating Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ratingDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" label={{ value: 'Rating', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Games', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelStyle={{ color: '#000' }} />
            <Bar dataKey="count" fill="#8B5CF6" name="Number of Games" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Status Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Cost Efficiency Scatter */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Value Analysis: Rating vs Cost per Hour
          <span className="text-sm font-normal text-gray-600 ml-2">
            (Top right = High rating, Low cost = Best value)
          </span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="costPerHour"
              name="Cost per Hour"
              label={{ value: '$/Hour', position: 'insideBottom', offset: -5 }}
              domain={[0, 'auto']}
            />
            <YAxis
              type="number"
              dataKey="rating"
              name="Rating"
              label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
              domain={[0, 10]}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-sm">Rating: {data.rating}/10</p>
                      <p className="text-sm">Cost/Hour: ${data.costPerHour.toFixed(2)}</p>
                      <p className="text-sm">Hours: {data.hours}h</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Games" data={efficiencyData} fill="#8B5CF6" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
