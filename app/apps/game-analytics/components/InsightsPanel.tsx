'use client';

import { Card } from '@/components/ui/Card';
import { GameWithMetrics } from '../hooks/useAnalytics';

interface InsightsPanelProps {
  games: GameWithMetrics[];
}

export function InsightsPanel({ games }: InsightsPanelProps) {
  if (games.length === 0) return null;

  // Calculate insights
  const bestValue = games.reduce((best, game) =>
    game.hours > 0 && game.metrics.costPerHour < best.metrics.costPerHour ? game : best
  );

  const mostPlayed = games.reduce((max, game) =>
    game.hours > max.hours ? game : max
  );

  const highestRated = games.reduce((max, game) =>
    game.rating > max.rating ? game : max
  );

  const completedGames = games.filter(g => g.status === 'Completed').length;
  const completionRate = (completedGames / games.length) * 100;

  const avgHoursPerGame = games.reduce((sum, g) => sum + g.hours, 0) / games.length;

  const mostExpensive = games.reduce((max, game) =>
    game.price > max.price ? game : max
  );

  const cheapest = games.reduce((min, game) =>
    game.price < min.price ? game : min
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Key Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Best Value */}
          <Card className="p-4 border-l-4 border-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">🏆 Best Value</p>
                <p className="font-semibold text-gray-900">{bestValue.name}</p>
                <p className="text-xs text-green-600 mt-1">
                  ${bestValue.metrics.costPerHour.toFixed(2)}/hour
                </p>
              </div>
            </div>
          </Card>

          {/* Most Played */}
          <Card className="p-4 border-l-4 border-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">⏱️ Most Played</p>
                <p className="font-semibold text-gray-900">{mostPlayed.name}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {mostPlayed.hours} hours
                </p>
              </div>
            </div>
          </Card>

          {/* Highest Rated */}
          <Card className="p-4 border-l-4 border-yellow-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">⭐ Highest Rated</p>
                <p className="font-semibold text-gray-900">{highestRated.name}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {highestRated.rating}/10
                </p>
              </div>
            </div>
          </Card>

          {/* Completion Rate */}
          <Card className="p-4 border-l-4 border-purple-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">✅ Completion Rate</p>
                <p className="font-semibold text-gray-900">{completionRate.toFixed(1)}%</p>
                <p className="text-xs text-purple-600 mt-1">
                  {completedGames} of {games.length} games
                </p>
              </div>
            </div>
          </Card>

          {/* Average Hours */}
          <Card className="p-4 border-l-4 border-indigo-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">📈 Avg Hours/Game</p>
                <p className="font-semibold text-gray-900">{avgHoursPerGame.toFixed(1)}h</p>
                <p className="text-xs text-indigo-600 mt-1">
                  Per game average
                </p>
              </div>
            </div>
          </Card>

          {/* Price Range */}
          <Card className="p-4 border-l-4 border-pink-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">💰 Price Range</p>
                <p className="font-semibold text-gray-900">
                  ${cheapest.price} - ${mostExpensive.price}
                </p>
                <p className="text-xs text-pink-600 mt-1">
                  {cheapest.name} → {mostExpensive.name}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Top Games Leaderboard */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">🎮 Top Games</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* By Blend Score */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">By Blend Score</h4>
            <div className="space-y-2">
              {games
                .sort((a, b) => b.metrics.blendScore - a.metrics.blendScore)
                .slice(0, 5)
                .map((game, index) => (
                  <div key={game.id} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{game.name}</p>
                      <p className="text-xs text-gray-600">Score: {game.metrics.blendScore.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* By Hours */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">By Hours Played</h4>
            <div className="space-y-2">
              {games
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 5)
                .map((game, index) => (
                  <div key={game.id} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{game.name}</p>
                      <p className="text-xs text-gray-600">{game.hours}h</p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* By Rating */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">By Rating</h4>
            <div className="space-y-2">
              {games
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 5)
                .map((game, index) => (
                  <div key={game.id} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{game.name}</p>
                      <p className="text-xs text-gray-600">{game.rating}/10</p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
