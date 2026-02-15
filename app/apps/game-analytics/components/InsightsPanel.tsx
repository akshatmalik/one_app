'use client';

import { useMemo } from 'react';
import {
  Shield, Clock, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Skull, Tag, BarChart3, Target, Percent, Zap, Star, Gauge, PieChart,
  Receipt, Activity, ArrowUpDown, LineChart as LineChartIcon, Award, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { Game, BudgetSettings } from '../lib/types';
import {
  getEntertainmentComparison,
  getBacklogDoomsdayData,
  getSpendingForecast,
  getPriceBracketAnalysis,
  getDiscountInsights,
  getCostPerCompletion,
  getRatingBiasAnalysis,
  getTotalHours,
  getGamingCreditScore,
  getPareto8020,
  getImpulseTax,
  getPurchaseRhythm,
  getPriceCreep,
  getMoneyEfficiencyTrend,
  getRatingConfidence,
  getParetoAnalysis,
} from '../lib/calculations';
import clsx from 'clsx';

interface InsightsPanelProps {
  games: Game[];
  totalHours: number;
  avgCostPerHour: number;
  budgets?: BudgetSettings[];
}

export function InsightsPanel({ games, totalHours, avgCostPerHour, budgets = [] }: InsightsPanelProps) {
  const guiltFree = useMemo(() => getEntertainmentComparison(avgCostPerHour, totalHours), [avgCostPerHour, totalHours]);
  const doomsday = useMemo(() => getBacklogDoomsdayData(games), [games]);
  const currentYear = new Date().getFullYear();
  const currentBudget = budgets.find(b => b.year === currentYear);
  const forecast = useMemo(() => getSpendingForecast(games, currentYear, currentBudget?.yearlyBudget), [games, currentYear, currentBudget]);
  const priceBrackets = useMemo(() => getPriceBracketAnalysis(games), [games]);
  const discountInsights = useMemo(() => getDiscountInsights(games), [games]);
  const costPerCompletion = useMemo(() => getCostPerCompletion(games), [games]);
  const ratingBias = useMemo(() => getRatingBiasAnalysis(games), [games]);
  const creditScore = useMemo(() => getGamingCreditScore(games), [games]);
  const pareto8020 = useMemo(() => getPareto8020(games), [games]);
  const impulseTax = useMemo(() => getImpulseTax(games), [games]);
  const purchaseRhythm = useMemo(() => getPurchaseRhythm(games), [games]);
  const priceCreep = useMemo(() => getPriceCreep(games), [games]);
  const moneyEfficiency = useMemo(() => getMoneyEfficiencyTrend(games), [games]);
  const ratingConfidence = useMemo(() => getRatingConfidence(games), [games]);
  const paretoAnalysis = useMemo(() => getParetoAnalysis(games), [games]);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Zap size={14} className="text-yellow-400" />
        Deep Insights
      </h3>

      {/* Gaming Credit Score — Hero Position */}
      {ownedGames.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-4">
            <Gauge size={14} className="text-indigo-400" />
            Gaming Credit Score
          </h4>

          <div className="text-center mb-4">
            <div className="text-5xl font-black tracking-tight" style={{ color: creditScore.color }}>
              {creditScore.score}
            </div>
            <div className="text-sm font-medium mt-1" style={{ color: creditScore.color }}>
              {creditScore.label}
            </div>
            <div className="text-[10px] text-white/30 mt-1">
              Score range: 300 – 850
            </div>
          </div>

          {/* Score gauge bar */}
          <div className="mb-4">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((creditScore.score - 300) / 550) * 100}%`,
                  background: `linear-gradient(90deg, #ef4444, #f59e0b, #3b82f6, #10b981)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 mt-1">
              <span>300</span>
              <span>450</span>
              <span>550</span>
              <span>650</span>
              <span>750</span>
              <span>850</span>
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="space-y-2">
            {[
              { label: 'Library Played', value: creditScore.factors.played, color: '#8b5cf6' },
              { label: 'Value Efficiency', value: creditScore.factors.value, color: '#3b82f6' },
              { label: 'Completion Rate', value: creditScore.factors.completion, color: '#10b981' },
              { label: 'Low Regret', value: creditScore.factors.regret, color: '#f59e0b' },
            ].map(factor => (
              <div key={factor.label}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-white/50">{factor.label}</span>
                  <span className="text-white/70 font-medium">{factor.value}/100</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${factor.value}%`, backgroundColor: factor.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guilt-Free Gaming Calculator */}
      {avgCostPerHour > 0 && totalHours > 0 && (
        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Shield size={14} className="text-purple-400" />
            Guilt-Free Gaming
          </h4>

          {guiltFree.cheapestVs && (
            <div className="mb-3 p-3 bg-white/5 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {guiltFree.cheapestVs.multiplier}x cheaper
              </div>
              <div className="text-xs text-white/50">
                than {guiltFree.cheapestVs.name} (${avgCostPerHour.toFixed(2)}/hr vs ${guiltFree.comparisons.find(c => c.name === guiltFree.cheapestVs!.name)?.costPerHour}/hr)
              </div>
            </div>
          )}

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={guiltFree.comparisons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickFormatter={v => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  width={90}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-sm">
                          <p className="text-white/90 font-medium">{data.name}</p>
                          <p className="text-white/60">${data.costPerHour.toFixed(2)}/hr</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="costPerHour" radius={[0, 4, 4, 0]}>
                  {guiltFree.comparisons.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={entry.isGaming ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {guiltFree.savedVsMovies > 0 && (
            <div className="mt-3 text-center text-xs text-white/40">
              Your {totalHours.toFixed(0)}h of gaming would have cost <span className="text-red-400">${guiltFree.totalHoursValue.toFixed(0)}</span> at movie prices.
              You saved <span className="text-emerald-400">${guiltFree.savedVsMovies.toFixed(0)}</span>.
            </div>
          )}
        </div>
      )}

      {/* Backlog Doomsday Clock */}
      {doomsday.backlogCount > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Skull size={14} className="text-red-400" />
            Backlog Doomsday Clock
          </h4>

          <div className="text-center mb-3">
            <div className={clsx('text-xl font-bold', {
              'text-emerald-400': doomsday.humorTier === 'Backlog Zero' || doomsday.humorTier === 'Almost Free',
              'text-yellow-400': doomsday.humorTier === 'Getting There',
              'text-orange-400': doomsday.humorTier === 'Long Haul',
              'text-red-400': doomsday.humorTier === 'Retirement Project',
              'text-red-500': doomsday.humorTier === 'Heat Death',
            })}>
              {doomsday.humorTier}
            </div>
            {doomsday.clearanceDate && doomsday.humorTier !== 'Backlog Zero' && (
              <div className="text-sm text-white/50 mt-1">
                Estimated clear date: {doomsday.clearanceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-white">{doomsday.backlogCount}</div>
              <div className="text-[10px] text-white/40">backlog</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-emerald-400">{doomsday.completionRate.toFixed(1)}</div>
              <div className="text-[10px] text-white/40">completed/mo</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className={clsx('text-lg font-bold', doomsday.isGettingWorse ? 'text-red-400' : 'text-blue-400')}>
                {doomsday.acquisitionRate.toFixed(1)}
              </div>
              <div className="text-[10px] text-white/40">added/mo</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            {doomsday.isGettingWorse ? (
              <TrendingUp size={12} className="text-red-400" />
            ) : (
              <TrendingDown size={12} className="text-emerald-400" />
            )}
            <span>{doomsday.message}</span>
          </div>
        </div>
      )}

      {/* Spending Forecast */}
      {forecast.currentYearSpent > 0 && (
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-blue-400" />
            {currentYear} Spending Forecast
          </h4>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-white">${forecast.currentYearSpent.toFixed(0)}</div>
              <div className="text-[10px] text-white/40">spent so far</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400">${forecast.monthlyAvg.toFixed(0)}</div>
              <div className="text-[10px] text-white/40">per month avg</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className={clsx('text-lg font-bold', {
                'text-emerald-400': forecast.onTrack === 'under',
                'text-yellow-400': forecast.onTrack === 'close',
                'text-red-400': forecast.onTrack === 'over',
              })}>
                ${forecast.projectedAnnual.toFixed(0)}
              </div>
              <div className="text-[10px] text-white/40">projected total</div>
            </div>
          </div>

          {forecast.budgetAmount && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                <span>Budget: ${forecast.budgetAmount}</span>
                <span className={clsx({
                  'text-emerald-400': forecast.onTrack === 'under',
                  'text-yellow-400': forecast.onTrack === 'close',
                  'text-red-400': forecast.onTrack === 'over',
                })}>
                  {forecast.onTrack === 'under' && 'On Track'}
                  {forecast.onTrack === 'close' && 'Close to Budget'}
                  {forecast.onTrack === 'over' && 'Over Budget!'}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', {
                    'bg-emerald-500': forecast.onTrack === 'under',
                    'bg-yellow-500': forecast.onTrack === 'close',
                    'bg-red-500': forecast.onTrack === 'over',
                  })}
                  style={{ width: `${Math.min((forecast.currentYearSpent / forecast.budgetAmount) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {forecast.monthlyData.length > 1 && (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.monthlyData.slice(0, forecast.monthsElapsed + 3)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickFormatter={v => `$${v}`} />
                  <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Actual" />
                  <Line type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Projected" />
                  {forecast.budgetAmount && (
                    <Line type="monotone" dataKey="budget" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Budget" />
                  )}
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                            <p className="text-white/90 font-medium mb-1">{label}</p>
                            {payload.map((p, i) => (
                              <p key={i} style={{ color: p.color }}>
                                {p.name}: ${typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Price Sweet Spot */}
      {priceBrackets.length > 1 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Tag size={14} className="text-emerald-400" />
            Price Sweet Spot
          </h4>

          {/* Find best bracket by rating + hours combo */}
          {(() => {
            const best = [...priceBrackets]
              .filter(b => b.count >= 2)
              .sort((a, b) => (b.avgRating * b.avgHours) - (a.avgRating * a.avgHours))[0];
            return best ? (
              <div className="mb-3 p-2 bg-emerald-500/10 rounded-lg text-center">
                <span className="text-xs text-emerald-400">
                  Your sweet spot is <span className="font-bold">{best.bracket}</span> — avg {best.avgRating}/10 rating, {best.avgHours}h played
                </span>
              </div>
            ) : null;
          })()}

          <div className="space-y-2">
            {priceBrackets.map(bracket => (
              <div key={bracket.bracket} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                <div className="w-16 text-xs font-medium text-white/70">{bracket.bracket}</div>
                <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-xs font-medium text-yellow-400">{bracket.avgRating}</div>
                    <div className="text-[9px] text-white/30">rating</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-400">{bracket.avgHours}h</div>
                    <div className="text-[9px] text-white/30">avg hrs</div>
                  </div>
                  <div>
                    <div className={clsx('text-xs font-medium', bracket.avgCostPerHour <= 3 ? 'text-emerald-400' : bracket.avgCostPerHour <= 5 ? 'text-yellow-400' : 'text-red-400')}>
                      ${bracket.avgCostPerHour.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-white/30">$/hr</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-purple-400">{bracket.completionRate}%</div>
                    <div className="text-[9px] text-white/30">done</div>
                  </div>
                </div>
                <div className="text-[10px] text-white/30 w-8 text-right">{bracket.count}</div>
              </div>
            ))}
          </div>

          {/* Discount Insights */}
          {discountInsights.discountedCount > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Discount vs Full Price</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-white/[0.03] rounded-lg text-center">
                  <div className="text-xs text-white/60">Discounted ({discountInsights.discountedCount})</div>
                  <div className="text-sm font-medium text-emerald-400">{discountInsights.discountedAvgHours}h avg</div>
                  <div className="text-[10px] text-white/40">{discountInsights.discountedCompletionRate}% completed</div>
                </div>
                <div className="p-2 bg-white/[0.03] rounded-lg text-center">
                  <div className="text-xs text-white/60">Full Price ({discountInsights.fullPriceCount})</div>
                  <div className="text-sm font-medium text-blue-400">{discountInsights.fullPriceAvgHours}h avg</div>
                  <div className="text-[10px] text-white/40">{discountInsights.fullPriceCompletionRate}% completed</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost Per Completion */}
      {costPerCompletion.completedCount > 0 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Target size={14} className="text-cyan-400" />
            Cost Per Completion
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-xl font-bold text-white">${costPerCompletion.cleanCost.toFixed(0)}</div>
              <div className="text-[10px] text-white/40">per completed game</div>
            </div>
            {costPerCompletion.abandonedCount > 0 && (
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <div className="text-xl font-bold text-red-400">${costPerCompletion.abandonedSpend.toFixed(0)}</div>
                <div className="text-[10px] text-white/40">spent on {costPerCompletion.abandonedCount} abandoned</div>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-white/40 text-center">
            {costPerCompletion.completedCount} games completed out of {games.filter(g => g.status !== 'Wishlist').length} owned
          </div>
        </div>
      )}

      {/* Rating Bias */}
      {ratingBias.distribution.length > 0 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Star size={14} className="text-yellow-400" />
            Rating Personality
          </h4>

          <div className="text-center mb-3">
            <div className="text-lg font-bold text-yellow-400">{ratingBias.biasLabel}</div>
            <div className="text-xs text-white/40">
              {ratingBias.percentAbove7}% of games rated 7+ | Average: {ratingBias.average}/10 | Median: {ratingBias.median}
            </div>
          </div>

          {ratingBias.inflationTrend !== 'insufficient' && (
            <div className="mb-3 p-2 bg-white/5 rounded-lg text-center">
              <span className="text-xs text-white/50">
                {ratingBias.inflationTrend === 'inflating' && 'Your ratings are trending up over time — you\'re getting more generous'}
                {ratingBias.inflationTrend === 'deflating' && 'Your ratings are trending down — you\'re getting pickier'}
                {ratingBias.inflationTrend === 'stable' && 'Your rating style has been consistent over time'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The 80/20 Rule (Pareto Lite) */}
      {pareto8020.topGames.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-amber-400" />
            The 80/20 Rule
          </h4>

          <div className="text-center mb-3 p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-amber-400">
              {pareto8020.hoursPercent}% of hours
            </div>
            <div className="text-xs text-white/50 mt-1">
              come from just <span className="text-amber-400 font-medium">{pareto8020.topPercent}%</span> of your library
            </div>
          </div>

          <div className="space-y-1.5">
            {pareto8020.topGames.map((game, i) => (
              <div key={game.name} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
                <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-amber-400/70 bg-amber-400/10 rounded">
                  {i + 1}
                </div>
                <div className="flex-1 text-xs text-white/70 truncate">{game.name}</div>
                <div className="text-xs font-medium text-amber-400">{game.hours.toFixed(1)}h</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Impulse Tax */}
      {impulseTax.gameCount > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Receipt size={14} className="text-red-400" />
            The Impulse Tax
          </h4>

          <div className="text-center mb-3 p-3 bg-red-500/10 rounded-lg">
            <div className="text-2xl font-bold text-red-400">
              ${impulseTax.total.toFixed(0)}
            </div>
            <div className="text-xs text-white/50 mt-1">
              spent on <span className="text-red-400 font-medium">{impulseTax.gameCount} games</span> played less than 2 hours
            </div>
            {impulseTax.percentOfSpend > 0 && (
              <div className="text-[10px] text-white/30 mt-1">
                That&apos;s {impulseTax.percentOfSpend}% of your total spend
              </div>
            )}
          </div>

          {impulseTax.games.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Top Offenders</div>
              {impulseTax.games.map(game => (
                <div key={game.name} className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                  <div className="text-xs text-white/70 truncate flex-1">{game.name}</div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-white/30">{game.hours.toFixed(1)}h</span>
                    <span className="text-xs font-medium text-red-400">${game.price.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchase Rhythm Detector */}
      {purchaseRhythm.avgGap > 0 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Activity size={14} className="text-cyan-400" />
            Purchase Rhythm
          </h4>

          <div className="text-center mb-3">
            <div className="text-lg font-bold text-cyan-400">{purchaseRhythm.type}</div>
            <div className="text-xs text-white/40 mt-1">
              {purchaseRhythm.type === 'Binge Buyer' && 'You buy in bursts — several games at once, then nothing for a while'}
              {purchaseRhythm.type === 'Steady Drip' && 'You buy at a consistent, measured pace'}
              {purchaseRhythm.type === 'Sale Chaser' && 'Your purchases cluster around sale periods'}
              {purchaseRhythm.type === 'Drought Breaker' && 'Long dry spells followed by sudden sprees'}
              {purchaseRhythm.type === 'Not enough data' && 'Need more purchase history to detect patterns'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-white">{purchaseRhythm.avgGap}</div>
              <div className="text-[10px] text-white/40">avg days between</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-cyan-400">{purchaseRhythm.daysSinceLast}</div>
              <div className="text-[10px] text-white/40">days since last</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-white">{purchaseRhythm.clusters.length}</div>
              <div className="text-[10px] text-white/40">buying sprees</div>
            </div>
          </div>

          {purchaseRhythm.daysSinceLast > 0 && (
            <div className="mt-2 text-xs text-white/30 text-center">
              {purchaseRhythm.daysSinceLast > purchaseRhythm.avgGap
                ? `${purchaseRhythm.daysSinceLast - purchaseRhythm.avgGap} days past your usual buying rhythm`
                : `${purchaseRhythm.avgGap - purchaseRhythm.daysSinceLast} days until your usual next purchase`}
            </div>
          )}
        </div>
      )}

      {/* Price Creep / Discipline */}
      {priceCreep.quarterlyAvgPrice.length >= 2 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <ArrowUpDown size={14} className={priceCreep.trend === 'down' ? 'text-emerald-400' : priceCreep.trend === 'up' ? 'text-red-400' : 'text-blue-400'} />
            Price {priceCreep.trend === 'up' ? 'Creep' : priceCreep.trend === 'down' ? 'Discipline' : 'Stability'}
          </h4>

          <div className="text-center mb-3">
            <div className={clsx('text-lg font-bold', {
              'text-red-400': priceCreep.trend === 'up',
              'text-emerald-400': priceCreep.trend === 'down',
              'text-blue-400': priceCreep.trend === 'stable',
            })}>
              {priceCreep.direction}
            </div>
            {priceCreep.change !== 0 && (
              <div className="text-xs text-white/40 mt-1">
                Average purchase price {priceCreep.trend === 'up' ? 'up' : 'down'} {Math.abs(priceCreep.change)}% over time
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {priceCreep.quarterlyAvgPrice.slice(-6).map(q => {
              const maxAvg = Math.max(...priceCreep.quarterlyAvgPrice.map(p => p.avg));
              return (
                <div key={q.period} className="flex items-center gap-2">
                  <div className="w-14 text-[10px] text-white/40 shrink-0">{q.period}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', {
                        'bg-red-400/60': priceCreep.trend === 'up',
                        'bg-emerald-400/60': priceCreep.trend === 'down',
                        'bg-blue-400/60': priceCreep.trend === 'stable',
                      })}
                      style={{ width: `${maxAvg > 0 ? (q.avg / maxAvg) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-white/50 w-10 text-right">${q.avg.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Money Efficiency Trend */}
      {moneyEfficiency.quarters.length >= 2 && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <LineChartIcon size={14} className="text-emerald-400" />
            Money Efficiency Trend
          </h4>

          <div className="text-center mb-3">
            <div className={clsx('text-lg font-bold', {
              'text-emerald-400': moneyEfficiency.trend === 'improving',
              'text-red-400': moneyEfficiency.trend === 'declining',
              'text-blue-400': moneyEfficiency.trend === 'stable',
            })}>
              {moneyEfficiency.trend === 'improving' && 'Improving'}
              {moneyEfficiency.trend === 'declining' && 'Declining'}
              {moneyEfficiency.trend === 'stable' && 'Stable'}
            </div>
            {moneyEfficiency.improvement !== 0 && (
              <div className="text-xs text-white/40 mt-1">
                {moneyEfficiency.trend === 'improving'
                  ? `Cost-per-hour improved ${moneyEfficiency.improvement}% since your first tracked quarter`
                  : moneyEfficiency.trend === 'declining'
                    ? `Cost-per-hour worsened ${Math.abs(moneyEfficiency.improvement)}% over time`
                    : 'Spending efficiency has been consistent'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {moneyEfficiency.quarters.slice(-6).map(q => {
              const maxCph = Math.max(...moneyEfficiency.quarters.map(p => p.avgCostPerHour));
              return (
                <div key={q.period} className="flex items-center gap-2">
                  <div className="w-14 text-[10px] text-white/40 shrink-0">{q.period}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400/60"
                      style={{ width: `${maxCph > 0 ? (q.avgCostPerHour / maxCph) * 100 : 0}%` }}
                    />
                  </div>
                  <div className={clsx('text-[10px] w-12 text-right font-medium', q.avgCostPerHour <= 3 ? 'text-emerald-400' : q.avgCostPerHour <= 5 ? 'text-yellow-400' : 'text-red-400')}>
                    ${q.avgCostPerHour.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-[10px] text-white/20 text-center">
            Lower $/hr = better value on your purchases
          </div>
        </div>
      )}

      {/* Rating Confidence Score */}
      {ratingConfidence.rawTop10.length >= 3 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Award size={14} className="text-purple-400" />
            Rating Confidence
          </h4>

          <div className="text-center mb-3 p-3 bg-purple-500/10 rounded-lg">
            {ratingConfidence.differences > 0 ? (
              <>
                <div className="text-2xl font-bold text-purple-400">
                  {ratingConfidence.differences} games differ
                </div>
                <div className="text-xs text-white/50 mt-1">
                  between your raw top 10 and &quot;confident&quot; top 10 (5+ hours played)
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-emerald-400">Perfect Match</div>
                <div className="text-xs text-white/50 mt-1">
                  Your top-rated games stay the same regardless of playtime
                </div>
              </>
            )}
          </div>

          {ratingConfidence.generosityBias && (
            <div className="mb-3 p-2 bg-yellow-500/10 rounded-lg text-center">
              <span className="text-xs text-yellow-400">
                Generosity bias detected — you rate games higher when you&apos;ve played them less
              </span>
            </div>
          )}

          {ratingConfidence.differences > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Raw Top 5</div>
                <div className="space-y-1">
                  {ratingConfidence.rawTop10.slice(0, 5).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-white/30 w-3">{i + 1}</span>
                      <span className="text-white/60 truncate flex-1">{g.name}</span>
                      <span className="text-yellow-400 shrink-0">{g.rating}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Confident Top 5</div>
                <div className="space-y-1">
                  {ratingConfidence.confidentTop10.slice(0, 5).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-white/30 w-3">{i + 1}</span>
                      <span className="text-white/60 truncate flex-1">{g.name}</span>
                      <span className="text-purple-400 shrink-0">{g.rating}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pareto Games (Power Law) */}
      {paretoAnalysis.cumulativeChart.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Layers size={14} className="text-violet-400" />
            Pareto Games (Power Law)
          </h4>

          <div className="text-center mb-3 p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-violet-400">
              {paretoAnalysis.percentOfTotal}%
            </div>
            <div className="text-xs text-white/50 mt-1">
              of all your gaming hours come from just your <span className="text-violet-400 font-medium">top {paretoAnalysis.topN} games</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {paretoAnalysis.cumulativeChart.slice(0, 8).map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-4 text-[10px] text-white/30 shrink-0 text-right">{i + 1}</div>
                <div className="flex-1 truncate text-[10px] text-white/60">{entry.name}</div>
                <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${entry.cumPct}%`,
                      background: `linear-gradient(90deg, #8b5cf6, #d946ef)`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-violet-400 w-8 text-right shrink-0">{entry.cumPct}%</div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-[10px] text-white/20 text-center">
            Cumulative % of total gaming hours
          </div>
        </div>
      )}
    </div>
  );
}
