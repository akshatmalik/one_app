'use client';

import { motion } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';
import { useState, useEffect } from 'react';

interface AchievementsScreenProps {
  data: WeekInReviewData;
}

export function AchievementsScreen({ data }: AchievementsScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const hasAchievements =
    data.completedGames.length > 0 ||
    data.newGamesStarted.length > 0 ||
    data.milestonesReached.length > 0;

  useEffect(() => {
    if (hasAchievements) {
      const timer = setTimeout(() => setShowConfetti(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasAchievements]);

  if (!hasAchievements) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Confetti particles */}
      {showConfetti && (
        <>
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                position: 'fixed',
                top: '20%',
                left: '50%',
                opacity: 1,
              }}
              animate={{
                top: '100%',
                left: `${50 + (Math.random() - 0.5) * 80}%`,
                rotate: Math.random() * 720,
                opacity: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                ease: 'easeOut',
              }}
              className={`w-3 h-3 ${
                ['bg-purple-400', 'bg-blue-400', 'bg-cyan-400', 'bg-pink-400', 'bg-amber-400'][
                  i % 5
                ]
              } rounded-sm`}
            />
          ))}
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full mb-4 backdrop-blur-sm border border-amber-500/30">
          <Trophy size={24} className="text-amber-300" />
          <span className="text-amber-200 font-bold uppercase tracking-wide">Achievements Unlocked</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', bounce: 0.5 }}
        className="text-8xl text-center mb-8"
      >
        🏆
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-4xl md:text-5xl font-bold text-center text-white mb-12"
      >
        This Week&apos;s Victories
      </motion.h2>

      {/* Achievement cards */}
      <div className="space-y-4">
        {data.completedGames.length > 0 && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="p-6 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl border border-emerald-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">✅</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-emerald-300 mb-2">
                  Games Completed
                </h3>
                <div className="space-y-2">
                  {data.completedGames.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                    >
                      {game.thumbnail && (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white">{game.name}</div>
                        <div className="text-sm text-white/50">{game.hours.toFixed(1)}h total</div>
                      </div>
                      <Star className="text-emerald-400" size={20} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {data.newGamesStarted.length > 0 && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="p-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">🆕</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-blue-300 mb-2">
                  New Adventures Started
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.newGamesStarted.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2 + index * 0.1, type: 'spring' }}
                      className="px-4 py-2 bg-white/10 rounded-full border border-blue-400/30"
                    >
                      <span className="text-white font-medium">{game.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {data.milestonesReached.length > 0 && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">🏆</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-amber-300 mb-2">
                  Milestones Reached
                </h3>
                <div className="space-y-2">
                  {data.milestonesReached.map((milestone, index) => (
                    <motion.div
                      key={`${milestone.game.id}-${milestone.milestone}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                      className="p-3 bg-white/5 rounded-lg"
                    >
                      <div className="font-semibold text-white">{milestone.game.name}</div>
                      <div className="text-amber-400">{milestone.milestone}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
