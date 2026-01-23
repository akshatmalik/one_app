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
  ChevronDown,
  ChevronUp,
  Layers,
  Gift,
  List as ListIcon,
} from 'lucide-react';
import { Game, GameStatus, AnalyticsSummary, BudgetSettings } from '../lib/types';
import { calculateSummary, getCumulativeSpending, getHoursByMonth, getSpendingByMonth } from '../lib/calculations';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { PeriodStatsPanel } from './PeriodStatsPanel';
import { FunStatsPanel } from './FunStatsPanel';
import { AdvancedCharts } from './AdvancedCharts';
import { GamingHeatmap } from './GamingHeatmap';
import { ExpandedStatsPanel } from './ExpandedStatsPanel';
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
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | number>(currentYear);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [showDiscountGames, setShowDiscountGames] = useState(false);
  const [showAllGamesPlayed, setShowAllGamesPlayed] = useState(false);
  const [showROIRankings, setShowROIRankings] = useState(false);
  const [showAllFranchises, setShowAllFranchises] = useState(false);

  const isAllTime = selectedPeriod === 'all';
  const selectedYear = isAllTime ? currentYear : selectedPeriod;

  // Get budget for selected year (only for specific years)
  const selectedBudget = isAllTime ? undefined : budgets.find(b => b.year === selectedYear);
  const [budgetInput, setBudgetInput] = useState(selectedBudget?.yearlyBudget?.toString() || '');

  // Update budget input when year or budgets change
  useEffect(() => {
    if (isAllTime) {
      setBudgetInput('');
      setIsEditingBudget(false);
      return;
    }
    const budget = budgets.find(b => b.year === selectedYear);
    setBudgetInput(budget?.yearlyBudget?.toString() || '');
    setIsEditingBudget(false);
  }, [selectedPeriod, selectedYear, budgets, isAllTime]);

  // Get available years from games
  const availableYears = Array.from(new Set(
    games
      .filter(g => g.datePurchased)
      .map(g => parseInt(g.datePurchased!.split('-')[0]))
  )).sort((a, b) => b - a);

  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  // Filter games by selected period
  const filteredGames = isAllTime
    ? games
    : games.filter(g => {
        if (!g.datePurchased) return false;
        return g.datePurchased.startsWith(selectedYear.toString());
      });

  // Calculate period-specific stats
  const periodSpent = filteredGames.reduce((sum, g) => sum + (g.status !== 'Wishlist' ? g.price : 0), 0);
  const periodHours = filteredGames.reduce((sum, g) => sum + g.totalHours, 0);
  const periodGamesCount = filteredGames.filter(g => g.status !== 'Wishlist').length;
  const periodAvgCostPerHour = periodHours > 0 ? periodSpent / periodHours : 0;

  // Budget calculations (only for specific years)
  const budgetAmount = selectedBudget?.yearlyBudget || 0;
  const budgetRemaining = budgetAmount - periodSpent;
  const budgetUsedPercent = budgetAmount > 0 ? (periodSpent / budgetAmount) * 100 : 0;
  const monthsRemaining = 12 - new Date().getMonth();
  const monthlyBudgetRemaining = budgetRemaining > 0 && monthsRemaining > 0
    ? budgetRemaining / monthsRemaining
    : 0;

  const handleSaveBudget = async () => {
    if (!onSetBudget) return;
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    setSavingBudget(true);
    try {
      await onSetBudget(selectedYear, amount);
      setIsEditingBudget(false);
    } catch (error) {
      console.error('Failed to save budget:', error);
      alert('Failed to save budget. Please try again.');
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

  // ROI rankings (exclude free games)
  const roiRankings = [...playedGames]
    .filter(g => g.price > 0 && !g.acquiredFree)
    .map(g => ({
      name: g.name.length > 15 ? g.name.slice(0, 15) + '...' : g.name,
      fullName: g.name,
      roi: g.metrics.roi,
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 8);

  // Period ROI rankings
  const periodROIRankings = [...filteredGames]
    .filter(g => g.hours > 0 && g.price > 0 && !g.acquiredFree && g.status !== 'Wishlist')
    .map(g => ({
      game: g,
      roi: g.metrics.roi,
      roiRating: g.metrics.roi >= 50 ? 'Excellent' : g.metrics.roi >= 20 ? 'Good' : g.metrics.roi >= 5 ? 'Fair' : 'Poor',
    }))
    .sort((a, b) => b.roi - a.roi);

  // All games played in period
  const periodAllGamesPlayed = [...filteredGames]
    .filter(g => g.hours > 0 && g.status !== 'Wishlist')
    .sort((a, b) => b.hours - a.hours);

  // Period spending breakdown by game
  const periodSpendingByGame = [...filteredGames]
    .filter(g => g.status !== 'Wishlist')
    .sort((a, b) => b.price - a.price)
    .map(g => ({
      name: g.name.length > 18 ? g.name.slice(0, 18) + '...' : g.name,
      fullName: g.name,
      price: g.price,
      hours: g.hours,
      percent: periodSpent > 0 ? (g.price / periodSpent) * 100 : 0,
      thumbnail: g.thumbnail,
    }));

  // Monthly spending for the selected period
  const periodMonthlySpending = isAllTime
    ? monthlySpendingData
    : Object.entries(spendingByMonth)
        .filter(([month]) => month.startsWith(selectedYear.toString()))
        .map(([month, total]) => ({
          month,
          label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
          total,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

  // Franchise stats for the period
  const franchiseStats = Object.entries(
    filteredGames
      .filter(g => g.franchise && g.status !== 'Wishlist')
      .reduce((acc, g) => {
        const franchise = g.franchise!;
        if (!acc[franchise]) {
          acc[franchise] = { spent: 0, hours: 0, games: 0 };
        }
        acc[franchise].spent += g.price;
        acc[franchise].hours += g.hours;
        acc[franchise].games += 1;
        return acc;
      }, {} as Record<string, { spent: number; hours: number; games: number }>)
  )
    .map(([name, stats]) => ({
      name,
      ...stats,
      avgCostPerHour: stats.hours > 0 ? stats.spent / stats.hours : 0,
    }))
    .sort((a, b) => b.spent - a.spent);

  // Subscription stats for the period
  const periodFreeGames = filteredGames.filter(g => g.acquiredFree && g.status !== 'Wishlist');
  const periodTotalSaved = periodFreeGames.reduce((sum, g) => sum + (g.originalPrice || 0), 0);
  const periodFreeHours = periodFreeGames.reduce((sum, g) => sum + g.hours, 0);

  const subscriptionStats = Object.entries(
    periodFreeGames.reduce((acc, g) => {
      const source = g.subscriptionSource || 'Other';
      if (!acc[source]) {
        acc[source] = { saved: 0, hours: 0, games: 0, gamesList: [] };
      }
      acc[source].saved += g.originalPrice || 0;
      acc[source].hours += g.hours;
      acc[source].games += 1;
      acc[source].gamesList.push(g);
      return acc;
    }, {} as Record<string, { saved: number; hours: number; games: number; gamesList: GameWithMetrics[] }>)
  )
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.saved - a.saved);

  // Discount savings for the period
  const periodPaidGamesWithDiscount = filteredGames.filter(g =>
    g.status !== 'Wishlist' && !g.acquiredFree && g.originalPrice && g.originalPrice > g.price
  );
  const periodDiscountSavings = periodPaidGamesWithDiscount.reduce((sum, g) =>
    sum + ((g.originalPrice || 0) - g.price), 0
  );
  const periodAverageDiscount = periodPaidGamesWithDiscount.length > 0
    ? periodPaidGamesWithDiscount.reduce((sum, g) => {
        const discount = ((g.originalPrice || 0) - g.price) / (g.originalPrice || 1) * 100;
        return sum + discount;
      }, 0) / periodPaidGamesWithDiscount.length
    : 0;

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
      {/* Time Period Selector & Stats Section */}
      <div className="space-y-4">
        {/* Time Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              {isAllTime ? 'All Time' : selectedYear} Overview
            </h2>
          </div>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="appearance-none px-4 py-2 pr-8 bg-white/[0.03] border border-white/10 text-white rounded-lg text-sm font-medium focus:outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="all">All Time</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Period Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-emerald-400" />
              <span className="text-xs text-white/40">Spent</span>
            </div>
            <div className="text-xl font-bold text-white">${periodSpent.toFixed(0)}</div>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-blue-400" />
              <span className="text-xs text-white/40">Hours Played</span>
            </div>
            <div className="text-xl font-bold text-white">{periodHours.toFixed(0)}h</div>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 size={14} className="text-purple-400" />
              <span className="text-xs text-white/40">Games</span>
            </div>
            <div className="text-xl font-bold text-white">{periodGamesCount}</div>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-yellow-400" />
              <span className="text-xs text-white/40">Avg $/Hour</span>
            </div>
            <div className={clsx(
              'text-xl font-bold',
              periodAvgCostPerHour <= 1 ? 'text-emerald-400' :
              periodAvgCostPerHour <= 3 ? 'text-blue-400' :
              periodAvgCostPerHour <= 5 ? 'text-yellow-400' : 'text-red-400'
            )}>
              ${periodAvgCostPerHour.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Budget Card - only for specific years */}
        {!isAllTime && (
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
                  min="0"
                  step="0.01"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/30"
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
                      <div className="text-2xl font-bold text-white">${periodSpent.toFixed(0)}</div>
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

                {/* Monthly Budget Remaining */}
                {selectedYear === currentYear && monthlyBudgetRemaining > 0 && (
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <div className="text-lg font-semibold text-purple-400">
                      ${monthlyBudgetRemaining.toFixed(0)}/mo
                    </div>
                    <div className="text-[10px] text-white/40">remaining budget per month</div>
                  </div>
                )}
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
                  <div className="text-lg font-semibold text-white">${periodSpent.toFixed(0)}</div>
                  <div className="text-[10px] text-white/40">spent</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-white">{periodGamesCount}</div>
                  <div className="text-[10px] text-white/40">games</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <div className="text-lg font-semibold text-blue-400">{periodHours.toFixed(0)}h</div>
                  <div className="text-[10px] text-white/40">played</div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Period Spending Breakdown */}
        {periodSpendingByGame.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-400" />
              {isAllTime ? 'All Time' : selectedYear} Spending Breakdown
            </h3>
            <div className="space-y-2">
              {periodSpendingByGame.slice(0, 8).map((game, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Thumbnail */}
                  {game.thumbnail && (
                    <img
                      src={game.thumbnail}
                      alt={game.fullName}
                      className="w-8 h-8 object-cover rounded shrink-0"
                      loading="lazy"
                    />
                  )}
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
              {periodSpendingByGame.length > 8 && (
                <p className="text-[10px] text-white/30 text-center pt-2">
                  +{periodSpendingByGame.length - 8} more games
                </p>
              )}
            </div>
          </div>
        )}

        {/* Monthly Spending for Period */}
        {periodMonthlySpending.length > 0 && (
          <ChartCard title={`${isAllTime ? 'Monthly' : selectedYear + ' Monthly'} Spending`} icon={<BarChart3 size={16} />}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={periodMonthlySpending}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip content={CustomTooltip} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Franchise Stats */}
        {franchiseStats.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Layers size={14} className="text-purple-400" />
                {isAllTime ? 'All Time' : selectedYear} Franchise Stats
              </h3>
              {franchiseStats.length > 6 && (
                <button
                  onClick={() => setShowAllFranchises(!showAllFranchises)}
                  className="text-xs text-white/40 hover:text-white/70 transition-all"
                >
                  {showAllFranchises ? 'Show Less' : `Show All (${franchiseStats.length})`}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {(showAllFranchises ? franchiseStats : franchiseStats.slice(0, 6)).map((franchise, idx) => (
                <div key={idx} className="p-3 bg-white/[0.03] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white/90">{franchise.name}</span>
                    <span className="text-xs text-white/40">{franchise.games} game{franchise.games !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-semibold text-emerald-400">${franchise.spent.toFixed(0)}</div>
                      <div className="text-[10px] text-white/30">spent</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-blue-400">{franchise.hours.toFixed(0)}h</div>
                      <div className="text-[10px] text-white/30">played</div>
                    </div>
                    <div>
                      <div className={clsx(
                        'text-sm font-semibold',
                        franchise.avgCostPerHour <= 1 ? 'text-emerald-400' :
                        franchise.avgCostPerHour <= 3 ? 'text-blue-400' :
                        franchise.avgCostPerHour <= 5 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        ${franchise.avgCostPerHour.toFixed(2)}/h
                      </div>
                      <div className="text-[10px] text-white/30">avg cost</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Period ROI Rankings */}
        {periodROIRankings.length > 0 && (
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Trophy size={14} className="text-emerald-400" />
                {isAllTime ? 'All-Time' : selectedYear} ROI Rankings
              </h3>
              <button
                onClick={() => setShowROIRankings(!showROIRankings)}
                className="text-xs text-white/40 hover:text-white/70 transition-all"
              >
                {showROIRankings ? 'Show Less' : `Show All (${periodROIRankings.length})`}
              </button>
            </div>

            <div className="space-y-2">
              {(showROIRankings ? periodROIRankings : periodROIRankings.slice(0, 10)).map(({ game, roi, roiRating }, idx) => {
                const roiColor = roiRating === 'Excellent' ? 'text-emerald-400' :
                                 roiRating === 'Good' ? 'text-blue-400' :
                                 roiRating === 'Fair' ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={game.id} className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white/30 w-6 shrink-0">#{idx + 1}</span>
                      {game.thumbnail && (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-10 h-10 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm text-white/80 font-medium truncate">{game.name}</span>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded shrink-0 ml-2', {
                          'bg-emerald-500/20 text-emerald-400': roiRating === 'Excellent',
                          'bg-blue-500/20 text-blue-400': roiRating === 'Good',
                          'bg-yellow-500/20 text-yellow-400': roiRating === 'Fair',
                          'bg-red-500/20 text-red-400': roiRating === 'Poor',
                        })}>
                          {roiRating}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-white/40">
                        <span>${game.price}</span>
                        <span>•</span>
                        <span>{game.hours}h</span>
                        <span>•</span>
                        <span>{game.rating}/10</span>
                      </div>
                      <span className={clsx('font-bold text-sm', roiColor)}>
                        {roi.toFixed(1)} ROI
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Games Played in Period */}
        {periodAllGamesPlayed.length > 0 && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <ListIcon size={14} className="text-purple-400" />
                {isAllTime ? 'All' : selectedYear} Games Played
              </h3>
              <button
                onClick={() => setShowAllGamesPlayed(!showAllGamesPlayed)}
                className="text-xs text-white/40 hover:text-white/70 transition-all"
              >
                {showAllGamesPlayed ? 'Show Less' : `Show All (${periodAllGamesPlayed.length})`}
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <div className="text-lg font-bold text-purple-400">{periodAllGamesPlayed.length}</div>
                <div className="text-[10px] text-white/40">games played</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <div className="text-lg font-bold text-blue-400">
                  {periodAllGamesPlayed.reduce((sum, g) => sum + g.hours, 0).toFixed(0)}h
                </div>
                <div className="text-[10px] text-white/40">total hours</div>
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-2">
              {(showAllGamesPlayed ? periodAllGamesPlayed : periodAllGamesPlayed.slice(0, 15)).map((game) => (
                <div key={game.id} className="p-3 bg-white/[0.03] rounded-lg hover:bg-white/[0.05] transition-all border border-white/5">
                  <div className="flex items-start gap-3 mb-2">
                    {game.thumbnail && (
                      <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="w-12 h-12 object-cover rounded shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-white truncate">{game.name}</h4>
                        <span className={clsx('text-xs px-2 py-0.5 rounded shrink-0', {
                          'bg-emerald-500/20 text-emerald-400': game.status === 'Completed',
                          'bg-blue-500/20 text-blue-400': game.status === 'In Progress',
                          'bg-white/10 text-white/50': game.status === 'Not Started',
                          'bg-red-500/20 text-red-400': game.status === 'Abandoned',
                        })}>
                          {game.status}
                        </span>
                      </div>
                      {game.playLogs && game.playLogs.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>Last played: {new Date(game.playLogs[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-white/20">•</span>
                          <span>{game.playLogs.length} session{game.playLogs.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white/[0.02] rounded-lg">
                      <div className="text-sm font-semibold text-purple-400">{game.hours}h</div>
                      <div className="text-[10px] text-white/30">played</div>
                    </div>
                    <div className="p-2 bg-white/[0.02] rounded-lg">
                      <div className={clsx('text-sm font-semibold',
                        game.metrics.costPerHour <= 1 ? 'text-emerald-400' :
                        game.metrics.costPerHour <= 3 ? 'text-blue-400' :
                        game.metrics.costPerHour <= 5 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        ${game.metrics.costPerHour.toFixed(2)}/h
                      </div>
                      <div className="text-[10px] text-white/30">cost per hr</div>
                    </div>
                    <div className="p-2 bg-white/[0.02] rounded-lg">
                      <div className="text-sm font-semibold text-yellow-400">{game.rating}/10</div>
                      <div className="text-[10px] text-white/30">rating</div>
                    </div>
                  </div>
                </div>
              ))}
              {!showAllGamesPlayed && periodAllGamesPlayed.length > 15 && (
                <p className="text-[10px] text-white/30 text-center pt-2">
                  +{periodAllGamesPlayed.length - 15} more games
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subscription / Free Games Stats */}
        {periodFreeGames.length > 0 && (
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <Gift size={14} className="text-emerald-400" />
              {isAllTime ? 'All Time' : selectedYear} Subscription Savings
            </h3>

            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <div className="text-lg font-bold text-emerald-400">${periodTotalSaved.toFixed(0)}</div>
                <div className="text-[10px] text-white/40">total saved</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <div className="text-lg font-bold text-white">{periodFreeGames.length}</div>
                <div className="text-[10px] text-white/40">free games</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <div className="text-lg font-bold text-blue-400">{periodFreeHours.toFixed(0)}h</div>
                <div className="text-[10px] text-white/40">played</div>
              </div>
            </div>

            {/* By Subscription Service */}
            {subscriptionStats.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">By Service</div>
                {subscriptionStats.map((sub, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80">{sub.name}</span>
                        <span className="text-[10px] text-white/40">({sub.games} game{sub.games !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-blue-400">{sub.hours.toFixed(0)}h</span>
                        <span className="text-sm font-medium text-emerald-400">${sub.saved.toFixed(0)}</span>
                      </div>
                    </div>
                    {/* Games list */}
                    <div className="ml-2 space-y-1">
                      {sub.gamesList.map((game) => (
                        <div key={game.id} className="flex items-center gap-2 px-2 py-1 bg-white/[0.02] rounded text-xs">
                          {game.thumbnail && (
                            <img
                              src={game.thumbnail}
                              alt={game.name}
                              className="w-6 h-6 object-cover rounded shrink-0"
                              loading="lazy"
                            />
                          )}
                          <span className="text-white/60 flex-1 truncate">{game.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {game.hours > 0 && (
                              <span className="text-blue-400/70">{game.hours}h</span>
                            )}
                            <span className="text-emerald-400/70">${(game.originalPrice || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discount Savings Card - Period-based */}
      {periodDiscountSavings > 0 && (
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
            <DollarSign size={14} className="text-blue-400" />
            {isAllTime ? 'All-Time' : selectedYear} Discount Savings
          </h3>

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-lg font-bold text-blue-400">${periodDiscountSavings.toFixed(0)}</div>
              <div className="text-[10px] text-white/40">total saved</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <div className="text-lg font-bold text-purple-400">{periodAverageDiscount.toFixed(0)}%</div>
              <div className="text-[10px] text-white/40">avg discount</div>
            </div>
          </div>

          {/* Discounted Games List */}
          {periodPaidGamesWithDiscount.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowDiscountGames(!showDiscountGames)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-white/40" />
                  <span className="text-sm text-white/70">Discounted Games ({periodPaidGamesWithDiscount.length})</span>
                </div>
                {showDiscountGames ? <ChevronDown size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
              </button>
              {showDiscountGames && (
                <div className="mt-2 space-y-2">
                  {periodPaidGamesWithDiscount.map((game) => {
                    const discount = ((game.originalPrice || 0) - game.price) / (game.originalPrice || 1) * 100;
                    const saved = (game.originalPrice || 0) - game.price;
                    return (
                      <div key={game.id} className="p-3 bg-white/[0.03] rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          {game.thumbnail && (
                            <img
                              src={game.thumbnail}
                              alt={game.name}
                              className="w-10 h-10 object-cover rounded shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <span className="text-sm text-white/80 font-medium truncate">{game.name}</span>
                            <span className="text-xs font-medium px-2 py-0.5 bg-green-500/20 text-green-400 rounded shrink-0 ml-2">
                              {discount.toFixed(0)}% off
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 line-through">${(game.originalPrice || 0).toFixed(2)}</span>
                            <span className="text-blue-400 font-medium">${game.price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {game.hours > 0 && (
                              <span className="text-white/40">{game.hours}h played</span>
                            )}
                            <span className="text-emerald-400 font-medium">saved ${saved.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Period Stats Panel (This Week / This Month) */}
      <PeriodStatsPanel games={games} />

      {/* Gaming Activity Heatmap */}
      <GamingHeatmap games={games} />

      {/* Fun Stats Panel */}
      <FunStatsPanel games={games} />

      {/* Expanded Deep Insights Panel */}
      <ExpandedStatsPanel games={games} />

      {/* Advanced Charts */}
      <AdvancedCharts games={games} />

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

      {/* Highlights - Last Month (Horizontal Scroll) */}
      {(() => {
        // Calculate last month highlights
        const now = new Date();
        const lastMonthStart = new Date(now);
        lastMonthStart.setDate(lastMonthStart.getDate() - 30);
        const previousMonthStart = new Date(now);
        previousMonthStart.setDate(previousMonthStart.getDate() - 60);

        // Filter games with play activity in last 30 days
        const lastMonthGames = games.filter(g => {
          if (!g.playLogs || g.playLogs.length === 0) return false;
          return g.playLogs.some(log => new Date(log.date) >= lastMonthStart);
        }).map(g => {
          // Calculate hours played in last month
          const lastMonthHours = g.playLogs!
            .filter(log => new Date(log.date) >= lastMonthStart)
            .reduce((sum, log) => sum + log.hours, 0);

          // Calculate hours in previous month (30-60 days ago)
          const previousMonthHours = g.playLogs!
            .filter(log => {
              const logDate = new Date(log.date);
              return logDate >= previousMonthStart && logDate < lastMonthStart;
            })
            .reduce((sum, log) => sum + log.hours, 0);

          return { ...g, lastMonthHours, previousMonthHours };
        }).filter(g => g.lastMonthHours > 0);

        // Calculate metrics for last month
        const lastMonthBestValue = lastMonthGames
          .filter(g => g.status !== 'Wishlist' && g.hours > 0 && g.price > 0)
          .sort((a, b) => {
            const aCost = a.price / a.hours;
            const bCost = b.price / b.hours;
            return aCost - bCost;
          })[0];

        const lastMonthMostPlayed = lastMonthGames
          .sort((a, b) => b.lastMonthHours - a.lastMonthHours)[0];

        const lastMonthHighestRated = lastMonthGames
          .filter(g => g.rating > 0)
          .sort((a, b) => b.rating - a.rating)[0];

        // Total hours and sessions in last month
        const lastMonthTotalHours = lastMonthGames.reduce((sum, g) => sum + g.lastMonthHours, 0);
        const lastMonthSessions = lastMonthGames.reduce((sum, g) => {
          const sessions = g.playLogs!.filter(log => new Date(log.date) >= lastMonthStart).length;
          return sum + sessions;
        }, 0);
        const lastMonthAvgSession = lastMonthSessions > 0 ? lastMonthTotalHours / lastMonthSessions : 0;

        // Most improved game (biggest hour increase)
        const mostImproved = lastMonthGames
          .filter(g => g.previousMonthHours > 0)
          .map(g => ({
            ...g,
            improvement: g.lastMonthHours - g.previousMonthHours,
            improvementPercent: ((g.lastMonthHours - g.previousMonthHours) / g.previousMonthHours) * 100
          }))
          .sort((a, b) => b.improvement - a.improvement)[0];

        // Comeback game (played this month after 30+ day break)
        const comebackGame = lastMonthGames.find(g => {
          if (!g.playLogs || g.playLogs.length < 2) return false;
          const sortedLogs = [...g.playLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const recentLogs = sortedLogs.filter(log => new Date(log.date) >= lastMonthStart);
          const olderLogs = sortedLogs.filter(log => new Date(log.date) < lastMonthStart);

          if (recentLogs.length === 0 || olderLogs.length === 0) return false;

          const mostRecentOld = new Date(olderLogs[0].date);
          const daysSinceLastPlay = Math.floor((lastMonthStart.getTime() - mostRecentOld.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceLastPlay >= 30;
        });

        // Most played genre
        const genreHours = lastMonthGames.reduce((acc, g) => {
          if (g.genre) {
            acc[g.genre] = (acc[g.genre] || 0) + g.lastMonthHours;
          }
          return acc;
        }, {} as Record<string, number>);

        const topGenre = Object.entries(genreHours).sort((a, b) => b[1] - a[1])[0];

        return lastMonthGames.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/50">Last 30 Days</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {/* Total Hours */}
              <div className="shrink-0 w-[160px]">
                <HighlightCard
                  icon={<Clock size={16} />}
                  label="Total Hours"
                  value={`${lastMonthTotalHours.toFixed(1)}h`}
                  subValue={`${lastMonthGames.length} games`}
                  color="blue"
                />
              </div>

              {/* Average Session */}
              {lastMonthAvgSession > 0 && (
                <div className="shrink-0 w-[160px]">
                  <HighlightCard
                    icon={<Activity size={16} />}
                    label="Avg Session"
                    value={`${lastMonthAvgSession.toFixed(1)}h`}
                    subValue={`${lastMonthSessions} sessions`}
                    color="purple"
                  />
                </div>
              )}

              {/* Most Played */}
              {lastMonthMostPlayed && (
                <div className="shrink-0 w-[180px]">
                  <HighlightCard
                    icon={<Flame size={16} />}
                    label="Most Played"
                    value={lastMonthMostPlayed.name}
                    subValue={`${lastMonthMostPlayed.lastMonthHours.toFixed(1)}h`}
                    color="blue"
                  />
                </div>
              )}

              {/* Best Value */}
              {lastMonthBestValue && (
                <div className="shrink-0 w-[180px]">
                  <HighlightCard
                    icon={<Trophy size={16} />}
                    label="Best Value"
                    value={lastMonthBestValue.name}
                    subValue={`$${(lastMonthBestValue.price / lastMonthBestValue.hours).toFixed(2)}/hr`}
                    color="emerald"
                  />
                </div>
              )}

              {/* Highest Rated */}
              {lastMonthHighestRated && (
                <div className="shrink-0 w-[180px]">
                  <HighlightCard
                    icon={<Star size={16} />}
                    label="Highest Rated"
                    value={lastMonthHighestRated.name}
                    subValue={`${lastMonthHighestRated.rating}/10`}
                    color="yellow"
                  />
                </div>
              )}

              {/* Most Improved */}
              {mostImproved && mostImproved.improvement > 1 && (
                <div className="shrink-0 w-[180px]">
                  <HighlightCard
                    icon={<TrendingUp size={16} />}
                    label="Most Improved"
                    value={mostImproved.name}
                    subValue={`+${mostImproved.improvement.toFixed(1)}h`}
                    color="emerald"
                  />
                </div>
              )}

              {/* Comeback Game */}
              {comebackGame && (
                <div className="shrink-0 w-[180px]">
                  <HighlightCard
                    icon={<Target size={16} />}
                    label="Comeback"
                    value={comebackGame.name}
                    subValue={`${comebackGame.lastMonthHours.toFixed(1)}h`}
                    color="cyan"
                  />
                </div>
              )}

              {/* Top Genre */}
              {topGenre && (
                <div className="shrink-0 w-[160px]">
                  <HighlightCard
                    icon={<Gamepad2 size={16} />}
                    label="Top Genre"
                    value={topGenre[0]}
                    subValue={`${topGenre[1].toFixed(1)}h`}
                    color="purple"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
          <ChartCard title="Best ROI (Quality-Weighted Value Score)" icon={<Trophy size={16} />}>
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
  color: 'emerald' | 'blue' | 'yellow' | 'red' | 'purple' | 'cyan';
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
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
