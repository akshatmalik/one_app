'use client';

import { useState, useEffect } from 'react';
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Star,
  Gamepad2,
  Trophy,
  Target,
  Flame,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Wallet,
  Edit3,
  Check,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Game, GameStatus, AnalyticsSummary, BudgetSettings } from '../lib/types';
import { calculateSummary, getCumulativeSpending, getHoursByMonth, getSpendingByMonth } from '../lib/calculations';
import { GameWithMetrics } from '../hooks/useAnalytics';
import clsx from 'clsx';

interface StatsViewProps {
  games: GameWithMetrics[];
  summary: AnalyticsSummary;
  budgets?: BudgetSettings[];
  onSetBudget?: (year: number, amount: number) => Promise<void>;
}

const STATUS_COLORS: Record<GameStatus, string> = {
  'Completed': '#10b981',
  'In Progress': '#3b82f6',
  'Not Started': '#6b7280',
  'Wishlist': '#a855f7',
  'Abandoned': '#ef4444',
};

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#84cc16'];

export function StatsView({ games, summary, budgets = [], onSetBudget }: StatsViewProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  // Get budget for selected year
  const selectedBudget = budgets.find(b => b.year === selectedYear);
  const [budgetInput, setBudgetInput] = useState(selectedBudget?.yearlyBudget?.toString() || '');

  // Update budget input when year or budgets change
  useEffect(() => {
    const budget = budgets.find(b => b.year === selectedYear);
    setBudgetInput(budget?.yearlyBudget?.toString() || '');
    setIsEditingBudget(false);
  }, [selectedYear, budgets]);

  // Get available years from games
  const availableYears = Array.from(new Set(
    games
      .filter(g => g.datePurchased)
      .map(g => parseInt(g.datePurchased!.split('-')[0]))
  )).sort((a, b) => b - a);

  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  // Filter games by selected year (based on purchase date)
  const yearGames = games.filter(g => {
    if (!g.datePurchased) return false;
    return g.datePurchased.startsWith(selectedYear.toString());
  });

  // Calculate year-specific stats
  const yearSpent = yearGames.reduce((sum, g) => sum + (g.status !== 'Wishlist' ? g.price : 0), 0);
  const yearHours = yearGames.reduce((sum, g) => sum + g.hours, 0);
  const yearGamesCount = yearGames.filter(g => g.status !== 'Wishlist').length;

  // Budget calculations
  const budgetAmount = selectedBudget?.yearlyBudget || 0;
  const budgetRemaining = budgetAmount - yearSpent;
  const budgetUsedPercent = budgetAmount > 0 ? (yearSpent / budgetAmount) * 100 : 0;
  const monthsRemaining = 12 - new Date().getMonth();
  const monthlyBudgetRemaining = budgetRemaining > 0 && monthsRemaining > 0
    ? budgetRemaining / monthsRemaining
    : 0;

  const handleSaveBudget = async () => {
    if (!onSetBudget) return;
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) return;

    setSavingBudget(true);
    try {
      await onSetBudget(selectedYear, amount);
      setIsEditingBudget(false);
    } finally {
      setSavingBudget(false);
    }
  };

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  const playedGames = ownedGames.filter(g => g.hours > 0);

  // Spending by Game (top 10)
  const spendingByGame = [...ownedGames]
    .sort((a, b) => b.price - a.price)
    .slice(0, 10)
    .map(g => ({
      name: g.name.length > 20 ? g.name.slice(0, 20) + '...' : g.name,
      fullName: g.name,
      price: g.price,
      hours: g.hours,
    }));

  // Status distribution
  const statusData = Object.entries(
    games.reduce((acc, g) => {
      acc[g.status] = (acc[g.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status as GameStatus],
  }));

  // Genre distribution
  const genreData = Object.entries(summary.spendingByGenre)
    .map(([genre, total]) => ({ name: genre, value: total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Platform distribution
  const platformData = Object.entries(summary.spendingByPlatform)
    .map(([platform, total]) => ({ name: platform, value: total }))
    .sort((a, b) => b.value - a.value);

  // Source distribution
  const sourceData = Object.entries(summary.spendingBySource)
    .map(([source, total]) => ({ name: source, value: total }))
    .sort((a, b) => b.value - a.value);

  // Year over year spending
  const yearData = Object.entries(summary.spendingByYear)
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year.localeCompare(b.year));

  // Cumulative spending over time
  const cumulativeSpending = getCumulativeSpending(games);

  // Hours by month
  const hoursByMonth = getHoursByMonth(games);
  const hoursData = Object.entries(hoursByMonth)
    .map(([month, hours]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      hours,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Spending by month
  const spendingByMonth = getSpendingByMonth(games);
  const monthlySpendingData = Object.entries(spendingByMonth)
    .map(([month, total]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Value scatter (price vs hours)
  const valueData = playedGames.map(g => ({
    name: g.name,
    price: g.price,
    hours: g.hours,
    rating: g.rating,
    costPerHour: g.metrics.costPerHour,
  }));

  // Rating distribution
  const ratingDistribution = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: playedGames.filter(g => g.rating === i + 1).length,
  }));

  // Hours by genre for radar chart
  const genreHoursData = Object.entries(summary.hoursByGenre)
    .map(([genre, hours]) => ({ genre, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  // ROI rankings
  const roiRankings = [...playedGames]
    .map(g => ({
      name: g.name.length > 15 ? g.name.slice(0, 15) + '...' : g.name,
      fullName: g.name,
      roi: g.metrics.roi,
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 8);

  // Year spending breakdown by game
  const yearSpendingByGame = [...yearGames]
    .filter(g => g.status !== 'Wishlist')
    .sort((a, b) => b.price - a.price)
    .map(g => ({
      name: g.name.length > 18 ? g.name.slice(0, 18) + '...' : g.name,
      fullName: g.name,
      price: g.price,
      hours: g.hours,
      percent: yearSpent > 0 ? (g.price / yearSpent) * 100 : 0,
    }));

  // Monthly spending for the selected year
  const yearMonthlySpending = Object.entries(spendingByMonth)
    .filter(([month]) => month.startsWith(selectedYear.toString()))
    .map(([month, total]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
          <p className="text-white/90 font-medium">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white/60">
              {entry.name}: {entry.name.includes('price') || entry.name.includes('total') || entry.name.includes('value') ? '$' : ''}{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.name.includes('hours') || entry.name === 'hours' ? 'h' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Year Selector & Budget Section */}
      <div className="space-y-4">
        {/* Year Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Year Overview</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-1">
            <button
              onClick={() => setSelectedYear(y => Math.max(y - 1, Math.min(...availableYears)))}
              className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-white font-medium px-3 min-w-[60px] text-center">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))}
              disabled={selectedYear >= currentYear}
              className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Budget Card */}
        <div className="p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-purple-400" />
              <h3 className="text-sm font-medium text-white">{selectedYear} Gaming Budget</h3>
            </div>
            {onSetBudget && !isEditingBudget && (
              <button
                onClick={() => {
                  setBudgetInput(budgetAmount.toString());
                  setIsEditingBudget(true);
                }}
                className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg transition-all"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white/40">$</span>
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                placeholder="Set budget..."
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-purple-500/50"
                autoFocus
              />
              <button
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-all disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="p-2 bg-white/5 text-white/40 hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : budgetAmount > 0 ? (
            <>
              {/* Budget Progress */}
              <div className="mb-4">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold text-white">${yearSpent.toFixed(0)}</div>
                    <div className="text-xs text-white/40">of ${budgetAmount.toFixed(0)} budget</div>
                  </div>
                  <div className={clsx(
                    'text-right',
                    budgetRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    <div className="text-lg font-semibold">
                      {budgetRemaining >= 0 ? `$${budgetRemaining.toFixed(0)}` : `-$${Math.abs(budgetRemaining).toFixed(0)}`}
                    </div>
                    <div className="text-xs opacity-70">
                      {budgetRemaining >= 0 ? 'remaining' : 'over budget'}
                    </div>
                  </div>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      budgetUsedPercent <= 75 ? 'bg-emerald-500' :
                      budgetUsedPercent <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-white/30">
                  <span>{budgetUsedPercent.toFixed(0)}% used</span>
                  <span>{Math.max(0, 100 - budgetUsedPercent).toFixed(0)}% available</span>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-white">{yearGamesCount}</div>
                  <div className="text-[10px] text-white/40">games bought</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-blue-400">{yearHours.toFixed(0)}h</div>
                  <div className="text-[10px] text-white/40">played</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-purple-400">
                    ${monthlyBudgetRemaining.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-white/40">/mo remaining</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/40 text-sm mb-3">No budget set for {selectedYear}</p>
              {onSetBudget && (
                <button
                  onClick={() => {
                    setBudgetInput('500');
                    setIsEditingBudget(true);
                  }}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-sm font-medium transition-all"
                >
                  Set Budget
                </button>
              )}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-white">${yearSpent.toFixed(0)}</div>
                  <div className="text-[10px] text-white/40">spent</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-white">{yearGamesCount}</div>
                  <div className="text-[10px] text-white/40">games</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-blue-400">{yearHours.toFixed(0)}h</div>
                  <div className="text-[10px] text-white/40">played</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Year Spending Breakdown */}
        {yearSpendingByGame.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-400" />
              {selectedYear} Spending Breakdown
            </h3>
            <div className="space-y-2">
              {yearSpendingByGame.slice(0, 8).map((game, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/70 truncate">{game.fullName}</span>
                      <span className="text-xs text-white/50">${game.price}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500/50 rounded-full"
                        style={{ width: `${game.percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-white/30 w-10 text-right">
                    {game.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
              {yearSpendingByGame.length > 8 && (
                <p className="text-[10px] text-white/30 text-center pt-2">
                  +{yearSpendingByGame.length - 8} more games
                </p>
              )}
            </div>
          </div>
        )}

        {/* Monthly Spending for Year */}
        {yearMonthlySpending.length > 0 && (
          <ChartCard title={`${selectedYear} Monthly Spending`} icon={<BarChart3 size={16} />}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yearMonthlySpending}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={CustomTooltip} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* All-Time Summary Cards */}
      <div>
        <h3 className="text-sm font-medium text-white/50 mb-3">All-Time Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryCard
          icon={<Gamepad2 size={16} />}
          label="Total Games"
          value={summary.totalGames}
          subValue={`${summary.ownedCount} owned`}
        />
        <SummaryCard
          icon={<DollarSign size={16} />}
          label="Total Spent"
          value={`$${summary.totalSpent.toFixed(0)}`}
          subValue={`$${summary.averagePrice.toFixed(0)} avg`}
          color="emerald"
        />
        <SummaryCard
          icon={<Clock size={16} />}
          label="Total Hours"
          value={`${summary.totalHours.toFixed(0)}h`}
          subValue={`${summary.averageHoursPerGame.toFixed(1)}h avg`}
          color="blue"
        />
        <SummaryCard
          icon={<TrendingUp size={16} />}
          label="Cost Per Hour"
          value={`$${summary.averageCostPerHour.toFixed(2)}`}
          subValue={summary.averageCostPerHour <= 3 ? 'Great value!' : 'Could be better'}
          color={summary.averageCostPerHour <= 3 ? 'emerald' : 'yellow'}
        />
        <SummaryCard
          icon={<Star size={16} />}
          label="Avg Rating"
          value={`${summary.averageRating.toFixed(1)}/10`}
          subValue={summary.averageRating >= 7 ? 'High quality' : 'Mixed bag'}
          color="purple"
        />
        <SummaryCard
          icon={<Target size={16} />}
          label="Completion"
          value={`${summary.completionRate.toFixed(0)}%`}
          subValue={`${summary.completedCount} completed`}
          color="cyan"
        />
        </div>
      </div>

      {/* Highlights */}
      {(summary.bestValue || summary.mostPlayed || summary.highestRated || summary.bestROI) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summary.bestValue && (
            <HighlightCard
              icon={<Trophy size={16} />}
              label="Best Value"
              value={summary.bestValue.name}
              subValue={`$${summary.bestValue.costPerHour.toFixed(2)}/hr`}
              color="emerald"
            />
          )}
          {summary.worstValue && (
            <HighlightCard
              icon={<TrendingDown size={16} />}
              label="Worst Value"
              value={summary.worstValue.name}
              subValue={`$${summary.worstValue.costPerHour.toFixed(2)}/hr`}
              color="red"
            />
          )}
          {summary.mostPlayed && (
            <HighlightCard
              icon={<Flame size={16} />}
              label="Most Played"
              value={summary.mostPlayed.name}
              subValue={`${summary.mostPlayed.hours}h`}
              color="blue"
            />
          )}
          {summary.highestRated && (
            <HighlightCard
              icon={<Star size={16} />}
              label="Highest Rated"
              value={summary.highestRated.name}
              subValue={`${summary.highestRated.rating}/10`}
              color="yellow"
            />
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending by Game */}
        {spendingByGame.length > 0 && (
          <ChartCard title="Top Spending by Game" icon={<BarChart3 size={16} />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingByGame} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="price" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Status Distribution */}
        <ChartCard title="Games by Status" icon={<PieChartIcon size={16} />}>
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
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <p className="text-white/90 font-medium">{payload[0].name}</p>
                      <p className="text-white/60">{payload[0].value} games</p>
                    </div>
                  );
                }
                return null;
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-white/50">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Monthly Spending Trend */}
        {monthlySpendingData.length > 1 && (
          <ChartCard title="Monthly Spending Trend" icon={<Activity size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlySpendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fill="url(#spendingGradient)" strokeWidth={2} />
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Cumulative Spending */}
        {cumulativeSpending.length > 1 && (
          <ChartCard title="Cumulative Spending Over Time" icon={<TrendingUp size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cumulativeSpending.map(d => ({
                ...d,
                label: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Hours Played by Month */}
        {hoursData.length > 1 && (
          <ChartCard title="Hours Played by Month" icon={<Clock size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Spending by Genre */}
        {genreData.length > 1 && (
          <ChartCard title="Spending by Genre" icon={<PieChartIcon size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={genreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Value Analysis Scatter */}
        {valueData.length > 2 && (
          <ChartCard title="Value Analysis (Price vs Hours)" icon={<Target size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="price" name="Price" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <YAxis type="number" dataKey="hours" name="Hours" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <ZAxis type="number" dataKey="rating" range={[50, 200]} name="Rating" />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <p className="text-white/90 font-medium">{data.name}</p>
                        <p className="text-white/60">${data.price} • {data.hours}h • {data.rating}/10</p>
                        <p className="text-emerald-400">${data.costPerHour.toFixed(2)}/hr</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Scatter data={valueData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-white/30 text-center mt-2">Bubble size = rating • Top-left = best value</p>
          </ChartCard>
        )}

        {/* Rating Distribution */}
        <ChartCard title="Rating Distribution" icon={<Star size={16} />}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="rating" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <p className="text-white/90 font-medium">Rating: {label}/10</p>
                      <p className="text-white/60">{payload[0].value} games</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Platform Distribution */}
        {platformData.length > 1 && (
          <ChartCard title="Spending by Platform" icon={<Gamepad2 size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <p className="text-white/90 font-medium">{payload[0].name}</p>
                        <p className="text-white/60">${payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {platformData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-xs text-white/50">{entry.name}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* ROI Rankings */}
        {roiRankings.length > 0 && (
          <ChartCard title="Best ROI (Rating × Hours / Price)" icon={<Trophy size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roiRankings} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="roi" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Hours by Genre Radar */}
        {genreHoursData.length >= 3 && (
          <ChartCard title="Hours by Genre" icon={<Activity size={16} />}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={genreHoursData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="genre" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Radar name="Hours" dataKey="hours" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Year over Year Spending */}
        {yearData.length > 1 && (
          <ChartCard title="Yearly Spending" icon={<BarChart3 size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <p className="text-white/90 font-medium">{label}</p>
                        <p className="text-white/60">${payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Source Distribution */}
        {sourceData.length > 1 && (
          <ChartCard title="Spending by Store" icon={<DollarSign size={16} />}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Backlog Analysis */}
      {summary.backlogValue > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-yellow-400 mb-2">Backlog Alert</h3>
          <p className="text-white/60 text-sm">
            You have <span className="text-yellow-400 font-medium">${summary.backlogValue.toFixed(0)}</span> worth of unplayed games
            ({summary.notStartedCount} games). Consider finishing some before buying more!
          </p>
        </div>
      )}

      {/* Wishlist Summary */}
      {summary.wishlistValue > 0 && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-purple-400 mb-2">Wishlist Summary</h3>
          <p className="text-white/60 text-sm">
            Your wishlist contains <span className="text-purple-400 font-medium">{summary.wishlistCount}</span> games
            worth <span className="text-purple-400 font-medium">${summary.wishlistValue.toFixed(0)}</span>.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue, color = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'emerald' | 'blue' | 'purple' | 'yellow' | 'cyan' | 'red';
}) {
  const colors = {
    default: 'bg-white/[0.02] border-white/5',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    cyan: 'bg-cyan-500/10 border-cyan-500/20',
    red: 'bg-red-500/10 border-red-500/20',
  };
  const textColors = {
    default: 'text-white/40',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400',
    red: 'text-red-400',
  };

  return (
    <div className={clsx('p-3 rounded-xl border transition-all', colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        <span className={textColors[color]}>{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white/90">{value}</div>
      {subValue && <div className="text-xs text-white/30 mt-0.5">{subValue}</div>}
    </div>
  );
}

function HighlightCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: 'emerald' | 'blue' | 'yellow' | 'red';
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div className={clsx('p-3 rounded-xl border', colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <div className="text-sm font-medium text-white/90 truncate">{value}</div>
      <div className="text-xs opacity-50">{subValue}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-white/40">{icon}</span>
        <h3 className="text-sm font-medium text-white/70">{title}</h3>
      </div>
      {children}
    </div>
  );
}
