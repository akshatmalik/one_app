'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface Top3GamesScreenProps {
  data: WeekInReviewData;
}

export function Top3GamesScreen({ data }: Top3GamesScreenProps) {
  const topGames = data.gamesPlayed.slice(0, 3);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = topGames.length >= 3
    ? [topGames[1], topGames[0], topGames[2]]
    : topGames.length === 2
    ? [topGames[1], topGames[0]]
    : topGames;

  const podiumHeights = ['h-32 md:h-40', 'h-40 md:h-52', 'h-24 md:h-32'];
  const positions = [2, 1, 3];
  const colors = [
    'from-gray-500/30 to-gray-600/30 border-gray-400/40',
    'from-yellow-500/30 to-amber-600/30 border-yellow-400/40',
    'from-orange-600/30 to-orange-700/30 border-orange-500/40',
  ];
  const icons = [
    <Medal key="2" size={32} className="text-gray-300" />,
    <Trophy key="1" size={40} className="text-yellow-300" />,
    <Award key="3" size={28} className="text-orange-400" />,
  ];

  if (topGames.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          No Games This Week
        </h2>
        <p className="text-white/50">Start playing to see your top games!</p>
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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full mb-3 backdrop-blur-sm border border-yellow-500/30">
          <Trophy size={18} className="text-yellow-300" />
          <span className="text-yellow-200 font-bold uppercase tracking-wide text-sm">Hall of Fame</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Your Top Games
        </h2>
        <p className="text-white/50 mt-2">Champions of the week</p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-8">
        {podiumOrder.map((gameData, index) => {
          if (!gameData) return null;

          const actualPosition = positions[index];
          const delay = index * 0.2 + 0.3;

          return (
            <motion.div
              key={gameData.game.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay, type: 'spring', bounce: 0.4 }}
              className="flex flex-col items-center flex-1 max-w-[140px]"
            >
              {/* Medal/Trophy Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: delay + 0.3, type: 'spring' }}
                className="mb-3"
              >
                {icons[index]}
              </motion.div>

              {/* Game Thumbnail */}
              {gameData.game.thumbnail && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.2 }}
                  className="mb-3"
                >
                  <img
                    src={gameData.game.thumbnail}
                    alt={gameData.game.name}
                    className={`w-16 h-16 rounded-xl object-cover border-2 ${
                      actualPosition === 1 ? 'border-yellow-400' :
                      actualPosition === 2 ? 'border-gray-400' :
                      'border-orange-500'
                    }`}
                  />
                </motion.div>
              )}

              {/* Podium */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: delay + 0.1, type: 'spring' }}
                className={`w-full ${podiumHeights[index]} bg-gradient-to-t ${colors[index]}
                  rounded-t-2xl border-t-2 border-x-2 flex flex-col items-center justify-start pt-4 px-2
                  transform-origin-bottom`}
              >
                <div className={`text-4xl font-black mb-2 ${
                  actualPosition === 1 ? 'text-yellow-300' :
                  actualPosition === 2 ? 'text-gray-300' :
                  'text-orange-400'
                }`}>
                  {actualPosition}
                </div>

                <div className="text-center">
                  <div className="text-white font-bold text-sm mb-1 line-clamp-2">
                    {gameData.game.name}
                  </div>
                  <div className="text-white/70 text-xs">
                    {gameData.hours.toFixed(1)}h
                  </div>
                  <div className="text-white/40 text-xs">
                    {gameData.percentage.toFixed(0)}%
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="grid grid-cols-3 gap-3"
      >
        {topGames.slice(0, 3).map((gameData, index) => (
          <div
            key={gameData.game.id}
            className="p-3 bg-white/5 rounded-xl border border-white/10 text-center"
          >
            <div className="text-xs text-white/40 mb-1">#{index + 1}</div>
            <div className="text-white/70 text-xs mb-1">{gameData.sessions} sessions</div>
            <div className="text-white/50 text-xs">{gameData.daysPlayed} days</div>
          </div>
        ))}
      </motion.div>

      {/* Fun fact */}
      {topGames[0] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 text-center"
        >
          <p className="text-white/70 text-sm">
            <span className="text-purple-300 font-bold">{topGames[0].game.name}</span>
            {' '}dominated with{' '}
            <span className="text-purple-300 font-bold">{topGames[0].percentage.toFixed(0)}%</span>
            {' '}of your playtime!
          </p>
        </motion.div>
      )}
    </div>
  );
}
