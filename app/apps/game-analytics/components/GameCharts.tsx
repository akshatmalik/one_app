'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { GameStatus } from '../lib/types';

interface GameChartsProps {
  games: GameWithMetrics[];
}

const STATUS_COLORS: Record<GameStatus, string> = {
  'Completed': '#10b981',
  'In Progress': '#3b82f6',
  'Not Started': '#6b7280',
  'Wishlist': '#a855f7',
  'Abandoned': '#ef4444',
};

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function GameCharts({ games }: GameChartsProps) {
  // Filter out wishlist for spending charts
  const ownedGames = games.filter(g => g.status !== 'Wishlist');

  // 1. Spending by Game (Bar Chart)
  const spendingData = [...ownedGames]
    .sort((a, b) => b.price - a.price)
    .slice(0, 8)
    .map(game => ({
      name: game.name.length > 15 ? game.name.slice(0, 15) + '...' : game.name,
      fullName: game.name,
      price: game.price,
      hours: game.hours,
    }));

  // 2. Games by Status (Pie Chart)
  const statusCounts = games.reduce((acc, game) => {
    acc[game.status] = (acc[game.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status as GameStatus] || '#6b7280',
  }));

  // 3. Value Analysis (Hours vs Price scatter)
  const valueData = ownedGames
    .filter(g => g.hours > 0)
    .map(game => ({
      name: game.name,
      hours: game.hours,
      price: game.price,
      rating: game.rating,
      costPerHour: game.metrics.costPerHour,
    }));

  // 4. Spending by Genre (if available)
  const genreSpending = ownedGames.reduce((acc, game) => {
    const genre = game.genre || 'Unknown';
    acc[genre] = (acc[genre] || 0) + game.price;
    return acc;
  }, {} as Record<string, number>);

  const genreData = Object.entries(genreSpending)
    .map(([genre, total]) => ({ name: genre, value: total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
          <p className="text-white/90 font-medium">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white/60">
              {entry.name}: {entry.name === 'price' || entry.name === 'value' ? '$' : ''}{entry.value}
              {entry.name === 'hours' ? 'h' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
          <p className="text-white/90 font-medium">{payload[0].name}</p>
          <p className="text-white/60">{payload[0].value} games</p>
        </div>
      );
    }
    return null;
  };

  if (ownedGames.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">Analytics</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending by Game */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h3 className="text-sm font-medium text-white/70 mb-4">Spending by Game</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendingData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="price" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Games by Status */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h3 className="text-sm font-medium text-white/70 mb-4">Games by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-white/50">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hours vs Price (Value Analysis) */}
        {valueData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/70 mb-4">Value Analysis (Hours vs Price)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="price"
                  name="Price"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `$${v}`}
                  label={{ value: 'Price ($)', position: 'bottom', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="hours"
                  name="Hours"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="rating" range={[50, 200]} name="Rating" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                          <p className="text-white/90 font-medium">{data.name}</p>
                          <p className="text-white/60">${data.price} • {data.hours}h</p>
                          <p className="text-emerald-400">${data.costPerHour.toFixed(2)}/hr</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={valueData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-white/30 text-center mt-2">Bubble size = rating • Top-left = best value</p>
          </div>
        )}

        {/* Spending by Genre */}
        {genreData.length > 1 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/70 mb-4">Spending by Genre</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={genreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
