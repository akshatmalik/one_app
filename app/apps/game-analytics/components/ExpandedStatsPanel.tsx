'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  User,
  Zap,
  Clock,
  Rotate3D,
  DollarSign,
  Trophy,
  Calendar,
  Infinity,
  Brain,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Timer,
  PiggyBank,
  BarChart3,
  Play,
  Pause,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  getGamingPersonality,
  getSessionAnalysis,
  getRotationStats,
  getMoneyStats,
  getGamingAchievements,
  getYearInReview,
  getLifetimeStats,
  getPredictedBacklogClearance,
  getGenreRutAnalysis,
  getMonthlyTrends,
  getTotalHours,
  parseLocalDate,
} from '../lib/calculations';
import clsx from 'clsx';

interface ExpandedStatsPanelProps {
  games: Game[];
}

export function ExpandedStatsPanel({ games }: ExpandedStatsPanelProps) {
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showActiveGames, setShowActiveGames] = useState(false);
  const [showCoolingOff, setShowCoolingOff] = useState(false);
  const currentYear = new Date().getFullYear();

  // Calculate all the stats
  const personality = getGamingPersonality(games);
  const sessionAnalysis = getSessionAnalysis(games);
  const rotation = getRotationStats(games);
  const moneyStats = getMoneyStats(games);
  const achievements = getGamingAchievements(games);
  const yearReview = getYearInReview(games, currentYear);
  const lifetime = getLifetimeStats(games);
  const backlogClearance = getPredictedBacklogClearance(games);
  const genreRut = getGenreRutAnalysis(games);
  const monthlyTrends = getMonthlyTrends(games, 6);

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  // Personality type icons
  const personalityIcons: Record<string, string> = {
    'Completionist': '🏆',
    'Deep Diver': '🤿',
    'Sampler': '🎲',
    'Backlog Hoarder': '📦',
    'Balanced Gamer': '⚖️',
    'Speedrunner': '⚡',
    'Explorer': '🧭',
  };

  // Session style icons
  const sessionStyleIcons: Record<string, string> = {
    'Marathon Runner': '🏃',
    'Snack Gamer': '🍿',
    'Weekend Warrior': '🛡️',
    'Consistent Player': '📅',
    'Binge & Rest': '🔄',
  };

  // Rotation health colors
  const rotationHealthColors: Record<string, string> = {
    'Obsessed': 'text-purple-400',
    'Focused': 'text-blue-400',
    'Healthy': 'text-emerald-400',
    'Juggling': 'text-yellow-400',
    'Overwhelmed': 'text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-purple-400" />
        <h3 className="text-base font-semibold text-white">Deep Insights</h3>
      </div>

      {/* Gaming Personality Card */}
      <div className="p-5 bg-gradient-to-br from-purple-500/15 to-pink-500/15 border border-purple-500/30 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-purple-400" />
          <h4 className="text-sm font-medium text-white">Your Gaming Personality</h4>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{personalityIcons[personality.type] || '🎮'}</div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-purple-400 mb-1">{personality.type}</div>
            <div className="text-sm text-white/60">{personality.description}</div>
          </div>
        </div>

        {/* Traits */}
        {personality.traits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {personality.traits.map((trait, idx) => (
              <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Personality Score */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/40 mb-1">
            <span>Type Match Strength</span>
            <span>{personality.score.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${personality.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Session Style + Rotation Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session Style Card */}
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} className="text-blue-400" />
            <h4 className="text-sm font-medium text-white">Session Style</h4>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{sessionStyleIcons[sessionAnalysis.style] || '🎮'}</div>
            <div>
              <div className="text-lg font-bold text-blue-400">{sessionAnalysis.style}</div>
              <div className="text-xs text-white/50">{sessionAnalysis.description}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded-lg">
              <div className="text-sm font-semibold text-white">{sessionAnalysis.avgSessionLength.toFixed(1)}h</div>
              <div className="text-[10px] text-white/40">avg session</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <div className="text-sm font-semibold text-white">{sessionAnalysis.sessionsPerWeek.toFixed(1)}</div>
              <div className="text-[10px] text-white/40">sessions/week</div>
            </div>
          </div>
        </div>

        {/* Rotation Health Card */}
        <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Rotate3D size={16} className="text-emerald-400" />
            <h4 className="text-sm font-medium text-white">Current Rotation</h4>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className={clsx('text-2xl font-bold', rotationHealthColors[rotation.rotationHealth])}>
                {rotation.gamesInRotation} {rotation.gamesInRotation === 1 ? 'Game' : 'Games'}
              </div>
              <div className="text-xs text-white/50">{rotation.description}</div>
            </div>
            <div className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium',
              rotation.rotationHealth === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' :
              rotation.rotationHealth === 'Obsessed' ? 'bg-purple-500/20 text-purple-400' :
              rotation.rotationHealth === 'Focused' ? 'bg-blue-500/20 text-blue-400' :
              rotation.rotationHealth === 'Juggling' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {rotation.rotationHealth}
            </div>
          </div>

          {/* Active Games List */}
          {rotation.activeGames.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowActiveGames(!showActiveGames)}
                className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/70 transition-all"
              >
                <span className="flex items-center gap-1">
                  <Play size={12} /> Active Now ({rotation.activeGames.length})
                </span>
                {showActiveGames ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showActiveGames && (
                <div className="mt-2 space-y-1">
                  {rotation.activeGames.map(game => (
                    <div key={game.id} className="flex items-center gap-2 p-1.5 bg-white/5 rounded text-xs">
                      {game.thumbnail && (
                        <img src={game.thumbnail} alt="" className="w-6 h-6 rounded object-cover" />
                      )}
                      <span className="text-white/70 truncate flex-1">{game.name}</span>
                      <span className="text-emerald-400/70">{getTotalHours(game)}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cooling Off */}
          {rotation.coolingOff.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowCoolingOff(!showCoolingOff)}
                className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/70 transition-all"
              >
                <span className="flex items-center gap-1">
                  <Pause size={12} /> Cooling Off ({rotation.coolingOff.length})
                </span>
                {showCoolingOff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showCoolingOff && (
                <div className="mt-2 space-y-1">
                  {rotation.coolingOff.map(game => (
                    <div key={game.id} className="flex items-center gap-2 p-1.5 bg-white/5 rounded text-xs">
                      {game.thumbnail && (
                        <img src={game.thumbnail} alt="" className="w-6 h-6 rounded object-cover" />
                      )}
                      <span className="text-white/50 truncate flex-1">{game.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Money Deep Dive */}
      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank size={18} className="text-emerald-400" />
          <h4 className="text-sm font-medium text-white">Money Deep Dive</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Cost of Backlog */}
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="text-xl font-bold text-red-400">${moneyStats.costOfBacklog.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">unplayed value</div>
          </div>

          {/* Monthly Average */}
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="text-xl font-bold text-blue-400">${moneyStats.monthlyAverage.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">monthly avg</div>
          </div>

          {/* Avg Cost Per Completion */}
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="text-xl font-bold text-purple-400">${moneyStats.avgCostPerCompletion.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">per completion</div>
          </div>

          {/* Spending Trend */}
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1">
              {moneyStats.spendingTrend === 'increasing' && <TrendingUp size={18} className="text-red-400" />}
              {moneyStats.spendingTrend === 'decreasing' && <TrendingDown size={18} className="text-emerald-400" />}
              {moneyStats.spendingTrend === 'stable' && <Minus size={18} className="text-yellow-400" />}
              <span className={clsx('text-lg font-bold capitalize',
                moneyStats.spendingTrend === 'increasing' ? 'text-red-400' :
                moneyStats.spendingTrend === 'decreasing' ? 'text-emerald-400' : 'text-yellow-400'
              )}>
                {moneyStats.spendingTrend}
              </span>
            </div>
            <div className="text-[10px] text-white/40">spending trend</div>
          </div>
        </div>

        {/* Break-Even Hours */}
        {moneyStats.breakEvenHoursNeeded > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-yellow-400" />
              <span className="text-sm text-yellow-400">
                Play <strong>{moneyStats.breakEvenHoursNeeded.toFixed(0)} more hours</strong> to hit $2/hr average
              </span>
            </div>
          </div>
        )}

        {/* Impulse vs Planned */}
        {(moneyStats.impulsePurchases.length > 0 || moneyStats.plannedPurchases.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-400">{moneyStats.impulsePurchases.length}</div>
              <div className="text-[10px] text-white/40">impulse buys</div>
              <div className="text-[9px] text-white/30">played within 7 days</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-cyan-400">{moneyStats.plannedPurchases.length}</div>
              <div className="text-[10px] text-white/40">patient purchases</div>
              <div className="text-[9px] text-white/30">waited 30+ days</div>
            </div>
          </div>
        )}

        {/* Best Bargain & Biggest Regret */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {moneyStats.bestBargain && (
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <div className="text-[10px] text-emerald-400 mb-1">Best Bargain</div>
              <div className="flex items-center gap-2">
                {moneyStats.bestBargain.game.thumbnail && (
                  <img src={moneyStats.bestBargain.game.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 truncate">{moneyStats.bestBargain.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${moneyStats.bestBargain.game.price} • {getTotalHours(moneyStats.bestBargain.game)}h
                  </div>
                </div>
              </div>
            </div>
          )}
          {moneyStats.biggestRegret && (
            <div className="p-3 bg-red-500/10 rounded-lg">
              <div className="text-[10px] text-red-400 mb-1">Biggest Regret</div>
              <div className="flex items-center gap-2">
                {moneyStats.biggestRegret.game.thumbnail && (
                  <img src={moneyStats.biggestRegret.game.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 truncate">{moneyStats.biggestRegret.game.name}</div>
                  <div className="text-xs text-white/40">
                    ${moneyStats.biggestRegret.game.price} • {getTotalHours(moneyStats.biggestRegret.game)}h played
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lifetime Stats */}
      <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Infinity size={18} className="text-indigo-400" />
          <h4 className="text-sm font-medium text-white">Lifetime Stats</h4>
        </div>

        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-indigo-400 mb-1">{lifetime.totalHours.toFixed(0)}</div>
          <div className="text-sm text-white/50">total hours played</div>
        </div>

        {/* Fun Equivalents */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-white">{lifetime.equivalentDays.toFixed(1)}</div>
            <div className="text-[10px] text-white/40">days straight</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-white">{lifetime.equivalentWeeks.toFixed(1)}</div>
            <div className="text-[10px] text-white/40">weeks of gaming</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-white">{lifetime.moviesEquivalent}</div>
            <div className="text-[10px] text-white/40">movies worth</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-white">{lifetime.booksEquivalent}</div>
            <div className="text-[10px] text-white/40">audiobooks</div>
          </div>
        </div>

        {/* Gaming Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-cyan-400">{lifetime.hoursPerWeek.toFixed(1)}h</div>
            <div className="text-[10px] text-white/40">avg per week</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-400">{lifetime.gamesPerMonth.toFixed(1)}</div>
            <div className="text-[10px] text-white/40">games per month</div>
          </div>
        </div>

        {lifetime.firstGameDate && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-white/40">
            Gaming since {parseLocalDate(lifetime.firstGameDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <span className="text-white/20"> • </span>
            {lifetime.daysSinceFirstGame} days ago
          </div>
        )}
      </div>

      {/* Monthly Trends Sparkline */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-white/40" />
          <h4 className="text-sm font-medium text-white/70">6-Month Trends</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Hours Trend */}
          <div>
            <div className="text-xs text-white/40 mb-2">Hours Played</div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#8b5cf6"
                    fill="url(#hoursGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Trend */}
          <div>
            <div className="text-xs text-white/40 mb-2">Spending</div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#10b981"
                    fill="url(#spentGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Backlog Prediction + Genre Rut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backlog Clearance Prediction */}
        <div className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-orange-400" />
            <h4 className="text-sm font-medium text-white">Backlog Clearance</h4>
          </div>

          {backlogClearance.neverAt ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">♾️</div>
              <div className="text-sm text-orange-400">Never at {backlogClearance.neverAt}</div>
              <div className="text-xs text-white/40 mt-1">Start completing games!</div>
            </div>
          ) : backlogClearance.daysRemaining === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-sm text-emerald-400">Backlog Clear!</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {backlogClearance.date?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div className="text-xs text-white/40">
                {backlogClearance.daysRemaining} days at current rate
              </div>
            </div>
          )}
        </div>

        {/* Genre Rut Analysis */}
        <div className={clsx(
          'p-4 rounded-xl border',
          genreRut.isInRut
            ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
            : 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className={genreRut.isInRut ? 'text-yellow-400' : 'text-cyan-400'} />
            <h4 className="text-sm font-medium text-white">Genre Variety</h4>
          </div>

          {genreRut.isInRut ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">Genre Rut!</span>
              </div>
              <div className="text-sm text-white/60 mb-2">
                {genreRut.dominantPercentage.toFixed(0)}% {genreRut.dominantGenre}
              </div>
              <div className="text-xs text-white/40">{genreRut.suggestion}</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle size={20} className="text-cyan-400" />
                <span className="text-lg font-bold text-cyan-400">Healthy Mix!</span>
              </div>
              <div className="text-xs text-white/40">{genreRut.suggestion}</div>
            </div>
          )}

          {genreRut.underexploredGenres.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[10px] text-white/40 mb-1">Untouched genres:</div>
              <div className="flex flex-wrap gap-1">
                {genreRut.underexploredGenres.slice(0, 4).map((genre, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] rounded">
                    {genre}
                  </span>
                ))}
                {genreRut.underexploredGenres.length > 4 && (
                  <span className="text-[10px] text-white/30">+{genreRut.underexploredGenres.length - 4} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Year in Review */}
      <div className="p-5 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-violet-400" />
          <h4 className="text-sm font-medium text-white">{currentYear} Year in Review</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-violet-400">{yearReview.gamesAcquired}</div>
            <div className="text-[10px] text-white/40">games acquired</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-emerald-400">{yearReview.gamesCompleted}</div>
            <div className="text-[10px] text-white/40">games completed</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-400">{yearReview.totalHours.toFixed(0)}h</div>
            <div className="text-[10px] text-white/40">hours played</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-pink-400">${yearReview.totalSpent.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">spent</div>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {yearReview.topGame && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-[10px] text-white/40 mb-1">Most Played</div>
              <div className="text-sm font-medium text-white/90">{yearReview.topGame.name}</div>
              <div className="text-xs text-violet-400">{yearReview.topGame.hours.toFixed(1)}h</div>
            </div>
          )}
          {yearReview.topGenre && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-[10px] text-white/40 mb-1">Top Genre</div>
              <div className="text-sm font-medium text-white/90">{yearReview.topGenre.name}</div>
              <div className="text-xs text-fuchsia-400">{yearReview.topGenre.hours.toFixed(1)}h</div>
            </div>
          )}
        </div>

        {yearReview.savings > 0 && (
          <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg text-center">
            <div className="text-sm text-emerald-400">
              Saved <strong>${yearReview.savings.toFixed(0)}</strong> from deals & free games
            </div>
          </div>
        )}
      </div>

      {/* Gaming Achievements */}
      <div className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h4 className="text-sm font-medium text-white">Gaming Achievements</h4>
          </div>
          <div className="text-xs text-white/40">
            {unlockedAchievements.length}/{achievements.length} unlocked
          </div>
        </div>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
              <CheckCircle size={12} /> Unlocked
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {unlockedAchievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center"
                >
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <div className="text-xs font-medium text-white/90">{achievement.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/70 transition-all mb-2"
            >
              <span className="flex items-center gap-1">
                <Lock size={12} /> Locked ({lockedAchievements.length})
              </span>
              {showAllAchievements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAllAchievements && (
              <div className="space-y-2">
                {lockedAchievements.map(achievement => (
                  <div key={achievement.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl opacity-40">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white/70">{achievement.name}</span>
                          {achievement.current !== undefined && achievement.target && (
                            <span className="text-xs text-white/40">
                              {achievement.current}/{achievement.target}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/40">{achievement.description}</div>
                        {/* Progress Bar */}
                        {achievement.progress !== undefined && (
                          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500/50 rounded-full transition-all"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
