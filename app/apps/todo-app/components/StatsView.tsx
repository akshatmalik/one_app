'use client';

import { useState } from 'react';
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
  LineChart,
  Line,
} from 'recharts';
import {
  Trophy,
  Flame,
  Target,
  BarChart3,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { TaskStats, DailyCompletion, Priority } from '../lib/types';

interface StatsViewProps {
  weeklyStats: TaskStats;
  monthlyStats: TaskStats;
  weeklyData: DailyCompletion[];
  monthlyData: DailyCompletion[];
}

const PRIORITY_COLORS: Record<Priority, string> = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#3b82f6', // blue
  4: '#6b7280', // gray
};

export function StatsView({ weeklyStats, monthlyStats, weeklyData, monthlyData }: StatsViewProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const stats = period === 'week' ? weeklyStats : monthlyStats;
  const chartData = period === 'week' ? weeklyData : monthlyData;

  // Prepare priority data for chart
  const priorityData = [
    { name: 'P1 (Urgent)', priority: 1, ...stats.byPriority[1], color: PRIORITY_COLORS[1] },
    { name: 'P2 (High)', priority: 2, ...stats.byPriority[2], color: PRIORITY_COLORS[2] },
    { name: 'P3 (Medium)', priority: 3, ...stats.byPriority[3], color: PRIORITY_COLORS[3] },
    { name: 'P4 (Low)', priority: 4, ...stats.byPriority[4], color: PRIORITY_COLORS[4] },
  ].filter(p => p.total > 0);

  // Prepare category data for chart
  const categoryData = Object.entries(stats.byCategory)
    .map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.completed - a.completed);

  // Format chart data with labels
  const formattedChartData = chartData.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2a2342] border border-white/15 rounded-lg px-3 py-2 text-sm shadow-lg shadow-black/30">
          <p className="text-white/95 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white/75">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/95">Statistics</h2>
        <div className="flex bg-white/[0.05] border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setPeriod('week')}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
              period === 'week'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm shadow-purple-500/30'
                : 'text-white/65 hover:text-white/90'
            )}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
              period === 'month'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm shadow-purple-500/30'
                : 'text-white/65 hover:text-white/90'
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Trophy size={16} />}
          label="Total Points"
          value={stats.points}
          color="purple"
        />
        <StatCard
          icon={<Flame size={16} />}
          label="Current Streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`}
          subValue={`Best: ${stats.longestStreak}`}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          label="Completed"
          value={stats.completed}
          subValue={`of ${stats.total}`}
          color="emerald"
        />
        <StatCard
          icon={<Target size={16} />}
          label="Completion Rate"
          value={`${stats.completionRate.toFixed(0)}%`}
          color="blue"
        />
      </div>

      {/* Priority Breakdown */}
      {priorityData.length > 0 && (
        <ChartCard title="Tasks by Priority" icon={<BarChart3 size={16} />}>
          <div className="space-y-3">
            {priorityData.map((p) => (
              <div key={p.priority} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/85">{p.name}</span>
                  <span className="text-white/65">
                    {p.completed}/{p.total} ({p.total > 0 ? ((p.completed / p.total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${p.total > 0 ? (p.completed / p.total) * 100 : 0}%`,
                      backgroundColor: p.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <ChartCard title="Tasks by Category" icon={<BarChart3 size={16} />}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip content={CustomTooltip} />
              <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Category details */}
          <div className="mt-4 space-y-2">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white/[0.05] border border-white/5 rounded-lg">
                <span className="text-sm text-white/85">{cat.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-purple-300 font-medium">{cat.points} pts</span>
                  <span className="text-white/65">{cat.completed}/{cat.total}</span>
                  <span className="text-emerald-300 font-medium">{cat.completionRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Daily Completion Trend */}
      <ChartCard title={`${period === 'week' ? 'Last 7 Days' : 'Last 30 Days'} Progress`} icon={<TrendingUp size={16} />}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <Tooltip content={CustomTooltip} />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Points Over Time */}
      <ChartCard title="Points Earned" icon={<Trophy size={16} />}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
            <Tooltip content={CustomTooltip} />
            <Line
              type="monotone"
              dataKey="points"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Streak Info */}
      {stats.currentStreak > 0 && (
        <div className="p-4 bg-gradient-to-br from-orange-500/20 via-pink-500/10 to-red-500/15 border border-orange-400/30 rounded-xl shadow-sm shadow-orange-500/10">
          <div className="flex items-center gap-3 mb-2">
            <Flame size={20} className="text-orange-300" />
            <h3 className="text-sm font-semibold text-white/95">On Fire!</h3>
          </div>
          <p className="text-white/80 text-sm">
            You&apos;re on a <span className="text-orange-300 font-semibold">{stats.currentStreak}-day streak</span>!
            {stats.currentStreak === stats.longestStreak
              ? " This is your best streak yet!"
              : ` Your best is ${stats.longestStreak} days. Keep going!`}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'emerald' | 'blue' | 'purple' | 'orange';
}) {
  const colors = {
    default: 'bg-white/[0.05] border-white/10',
    emerald: 'bg-emerald-500/15 border-emerald-400/30',
    blue: 'bg-blue-500/15 border-blue-400/30',
    purple: 'bg-purple-500/15 border-purple-400/30',
    orange: 'bg-orange-500/15 border-orange-400/30',
  };
  const textColors = {
    default: 'text-white/60',
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    orange: 'text-orange-300',
  };

  return (
    <div className={clsx('p-3 rounded-xl border transition-all hover:brightness-110', colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        <span className={textColors[color]}>{icon}</span>
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white/95">{value}</div>
      {subValue && <div className="text-xs text-white/50 mt-0.5">{subValue}</div>}
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-white/[0.04] border border-white/10 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-300">{icon}</span>
        <h3 className="text-sm font-medium text-white/85">{title}</h3>
      </div>
      {children}
    </div>
  );
}
