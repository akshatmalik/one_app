'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Award, Star } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';
import { calculateCostPerHour } from '../../lib/calculations';

interface BestValueScreenProps {
  data: WeekInReviewData;
}

export function BestValueScreen({ data }: BestValueScreenProps) {
  // Calculate cost per hour for each game played
  const gamesWithValue = data.gamesPlayed
    .map(({ game, hours }) => {
      const costPerHour = game.price > 0 ? calculateCostPerHour(game.price, hours) : 0;
      return {
        game,
        hours,
        costPerHour,
        totalSpent: game.price,
      };
    })
    .filter(g => g.totalSpent > 0) // Only paid games
    .sort((a, b) => a.costPerHour - b.costPerHour) // Best value first (lowest $/hr)
    .slice(0, 5);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const colors = [
    'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    'from-gray-400/20 to-gray-500/20 border-gray-400/30',
    'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  ];

  const getValueRating = (costPerHour: number) => {
    if (costPerHour <= 1) return { text: 'Excellent', color: 'text-emerald-300', stars: 5 };
    if (costPerHour <= 3) return { text: 'Great', color: 'text-green-300', stars: 4 };
    if (costPerHour <= 5) return { text: 'Good', color: 'text-yellow-300', stars: 3 };
    if (costPerHour <= 10) return { text: 'Fair', color: 'text-orange-300', stars: 2 };
    return { text: 'Poor', color: 'text-red-300', stars: 1 };
  };

  if (gamesWithValue.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          No Value Data
        </h2>
        <p className="text-white/50">Play some paid games to see value metrics!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full mb-3 backdrop-blur-sm border border-emerald-500/30">
          <DollarSign size={18} className="text-emerald-300" />
          <span className="text-emerald-200 font-bold uppercase tracking-wide text-sm">Best Value</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Bang for Your Buck
        </h2>
        <p className="text-white/50 mt-2">Games with the best value this week</p>
      </motion.div>

      {/* Leaderboard */}
      <div className="space-y-3 mb-8">
        {gamesWithValue.map((gameData, index) => {
          const rating = getValueRating(gameData.costPerHour);

          return (
            <motion.div
              key={gameData.game.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.15 + 0.3, type: 'spring' }}
              className={`p-4 bg-gradient-to-r ${colors[index]} rounded-xl border relative overflow-hidden`}
            >
              {/* Rank */}
              <div className="absolute top-4 left-4 text-3xl">
                {medals[index]}
              </div>

              <div className="ml-12 flex items-center justify-between gap-4">
                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {gameData.game.thumbnail && (
                      <img
                        src={gameData.game.thumbnail}
                        alt={gameData.game.name}
                        className="w-12 h-12 rounded-lg object-cover border border-white/20"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm md:text-base truncate">
                        {gameData.game.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{gameData.hours.toFixed(1)}h played</span>
                        <span>•</span>
                        <span>${gameData.totalSpent.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < rating.stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                      />
                    ))}
                    <span className={`ml-2 text-xs font-medium ${rating.color}`}>
                      {rating.text}
                    </span>
                  </div>
                </div>

                {/* Cost per hour */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.15 + 0.5, type: 'spring' }}
                  className="text-right"
                >
                  <div className="text-2xl md:text-3xl font-black text-white">
                    ${gameData.costPerHour.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/50">per hour</div>
                </motion.div>
              </div>

              {/* Shine effect for #1 */}
              {index === 0 && (
                <motion.div
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    delay: 1,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Average Cost Per Hour */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="p-5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 text-center"
        >
          <TrendingDown size={24} className="mx-auto mb-2 text-cyan-300" />
          <div className="text-2xl font-black text-cyan-300 mb-1">
            ${data.totalCostPerHour.toFixed(2)}
          </div>
          <div className="text-white/70 text-sm">Avg $/hour</div>
          <div className="text-white/40 text-xs mt-1">This week</div>
        </motion.div>

        {/* Total Value */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-center"
        >
          <Award size={24} className="mx-auto mb-2 text-purple-300" />
          <div className="text-2xl font-black text-purple-300 mb-1">
            ${data.totalValueUtilized.toFixed(2)}
          </div>
          <div className="text-white/70 text-sm">Value Used</div>
          <div className="text-white/40 text-xs mt-1">From library</div>
        </motion.div>
      </div>

      {/* Savings vs Renting */}
      {data.savingsVsRenting > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20 text-center"
        >
          <p className="text-white/70 text-sm">
            💰 You saved{' '}
            <span className="text-emerald-300 font-bold">
              ${data.savingsVsRenting.toFixed(2)}
            </span>
            {' '}vs renting games this week!
          </p>
        </motion.div>
      )}

      {/* Best Value Game Callout */}
      {data.bestValueGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center"
        >
          <p className="text-white/70 text-sm">
            🏆{' '}
            <span className="text-yellow-300 font-bold">{data.bestValueGame.game.name}</span>
            {' '}is your value champion at{' '}
            <span className="text-yellow-300 font-bold">
              ${data.bestValueGame.costPerHour.toFixed(2)}/hr
            </span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
