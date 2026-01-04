'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getCumulativeSpending,
  getHoursByMonth,
  getSpendingByMonth,
  getPlatformPreference,
  getTotalHours,
} from '../lib/calculations';
import { TrendingUp, Activity, DollarSign, Zap, Target, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

interface AdvancedChartsProps {
  games: GameWithMetrics[];
}

export function AdvancedCharts({ games }: AdvancedChartsProps) {
  // 1. Cumulative Spending Over Time
  const cumulativeData = getCumulativeSpending(games);

  // 2. Monthly Spending vs Hours (Dual-Axis)
  const hoursByMonth = getHoursByMonth(games);
  const spendingByMonth = getSpendingByMonth(games);

  const monthlyComparisonData = Object.keys({ ...hoursByMonth, ...spendingByMonth })
    .sort()
    .map(month => ({
      month: month.substring(5), // MM format
      fullMonth: month,
      hours: hoursByMonth[month] || 0,
      spending: spendingByMonth[month] || 0,
    }));

  // 3. Gaming Velocity Timeline (last 12 months)
  const last12Months = monthlyComparisonData.slice(-12);
  const velocityData = last12Months.map(m => ({
    month: m.month,
    hoursPerDay: (m.hours / 30).toFixed(1),
    totalHours: m.hours,
  }));

  // 4. Platform Radar Chart
  const platformPrefs = getPlatformPreference(games);
  const platformRadarData = platformPrefs.slice(0, 6).map(p => ({
    platform: p.platform.length > 10 ? p.platform.substring(0, 10) : p.platform,
    hours: p.hours,
    score: p.score,
  }));

  // 5. Genre Distribution
  const genreHours: Record<string, number> = {};
  games.forEach(g => {
    if (g.genre && getTotalHours(g) > 0) {
      genreHours[g.genre] = (genreHours[g.genre] || 0) + getTotalHours(g);
    }
  });
  const genreRadarData = Object.entries(genreHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, hours]) => ({
      genre: genre.length > 15 ? genre.substring(0, 15) + '...' : genre,
      hours,
    }));

  // 6. Discount Effectiveness Timeline
  const discountByMonth: Record<string, { savings: number; count: number }> = {};
  games.forEach(g => {
    if (g.datePurchased && g.originalPrice && g.originalPrice > g.price) {
      const month = g.datePurchased.substring(0, 7);
      if (!discountByMonth[month]) {
        discountByMonth[month] = { savings: 0, count: 0 };
      }
      discountByMonth[month].savings += (g.originalPrice - g.price);
      discountByMonth[month].count += 1;
    }
  });
  const discountTimelineData = Object.entries(discountByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month: month.substring(5),
      savings: data.savings,
      avgDiscount: data.savings / data.count,
      games: data.count,
    }));

  // 7. Value Efficiency Over Time (cost per hour by month)
  const valueByMonth: Record<string, { totalCost: number; totalHours: number }> = {};
  games.forEach(g => {
    if (g.datePurchased && getTotalHours(g) > 0 && g.status !== 'Wishlist') {
      const month = g.datePurchased.substring(0, 7);
      if (!valueByMonth[month]) {
        valueByMonth[month] = { totalCost: 0, totalHours: 0 };
      }
      valueByMonth[month].totalCost += g.price;
      valueByMonth[month].totalHours += getTotalHours(g);
    }
  });
  const valueTimelineData = Object.entries(valueByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month: month.substring(5),
      costPerHour: data.totalHours > 0 ? data.totalCost / data.totalHours : 0,
      hours: data.totalHours,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
          <p className="text-white/90 font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-xs">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              {entry.name === 'spending' || entry.name === 'savings' ? '$' : ''}
              {entry.name === 'hours' ? 'h' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (games.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={20} className="text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Advanced Analytics</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative Spending Timeline */}
        {cumulativeData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-purple-400" />
              <h3 className="text-sm font-medium text-white/70">Cumulative Spending</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Your gaming investment over time</p>
          </div>
        )}

        {/* Monthly Spending vs Hours */}
        {monthlyComparisonData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-cyan-400" />
              <h3 className="text-sm font-medium text-white/70">Monthly: Spending vs Hours</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={last12Months}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="spending" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Purple = $  •  Blue = Hours</p>
          </div>
        )}

        {/* Gaming Velocity */}
        {velocityData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-yellow-400" />
              <h3 className="text-sm font-medium text-white/70">Gaming Velocity</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Hours played per month</p>
          </div>
        )}

        {/* Platform Radar */}
        {platformRadarData.length > 2 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-emerald-400" />
              <h3 className="text-sm font-medium text-white/70">Platform Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={platformRadarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="platform"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                />
                <Radar
                  name="Hours"
                  dataKey="hours"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Hours played by platform</p>
          </div>
        )}

        {/* Genre Radar */}
        {genreRadarData.length > 2 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-pink-400" />
              <h3 className="text-sm font-medium text-white/70">Genre Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={genreRadarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="genre"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                />
                <Radar
                  name="Hours"
                  dataKey="hours"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Hours played by genre</p>
          </div>
        )}

        {/* Discount Effectiveness Timeline */}
        {discountTimelineData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} className="text-blue-400" />
              <h3 className="text-sm font-medium text-white/70">Savings Timeline</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={discountTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Money saved from discounts</p>
          </div>
        )}

        {/* Value Efficiency Over Time */}
        {valueTimelineData.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-400" />
              <h3 className="text-sm font-medium text-white/70">Value Efficiency Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={valueTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="costPerHour"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-white/30 text-center mt-2">Cost per hour by purchase month (lower is better)</p>
          </div>
        )}
      </div>
    </div>
  );
}
