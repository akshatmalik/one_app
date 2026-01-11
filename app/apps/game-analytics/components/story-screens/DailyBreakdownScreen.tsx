'use client';

import { motion } from 'framer-motion';
import { Calendar, Zap } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface DailyBreakdownScreenProps {
  data: WeekInReviewData;
}

export function DailyBreakdownScreen({ data }: DailyBreakdownScreenProps) {
  const maxHours = Math.max(...data.dailyHours.map(d => d.hours));

  // Color palette for different games
  const gameColors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  // Build a color map for games
  const allGames = Array.from(
    new Set(data.dailyHours.flatMap(day => day.gameNames))
  );
  const gameColorMap = new Map(
    allGames.map((game, index) => [game, gameColors[index % gameColors.length]])
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full mb-4 backdrop-blur-sm border border-blue-500/30">
          <Calendar size={24} className="text-blue-300" />
          <span className="text-blue-200 font-bold uppercase tracking-wide">Daily Breakdown</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Your Week at a Glance
        </h2>
      </motion.div>

      {/* Bar chart */}
      <div className="mb-8">
        <div className="flex items-end justify-between gap-2 md:gap-4 h-80">
          {data.dailyHours.map((day, dayIndex) => {
            const heightPercentage = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
            const isBusiestDay = data.busiestDay?.day === day.day;

            return (
              <motion.div
                key={day.day}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  delay: 0.3 + dayIndex * 0.1,
                  duration: 0.6,
                  type: 'spring',
                  bounce: 0.4,
                }}
                className="flex-1 flex flex-col items-center"
                style={{ originY: 1 }}
              >
                {/* Bar */}
                <div
                  className="w-full relative group cursor-pointer mb-3 rounded-t-lg overflow-hidden"
                  style={{ height: `${heightPercentage}%` }}
                >
                  {day.hours > 0 ? (
                    <>
                      {/* Stacked segments for each game */}
                      {day.gameNames.length > 0 ? (
                        <div className="h-full flex flex-col">
                          {day.gameNames.map((game, gameIndex) => {
                            // Calculate this game's portion
                            const gameHours = data.gamesPlayed.find(
                              g => g.game.name === game
                            )?.hours || 0;
                            const gamePortion = (gameHours / day.hours) * 100;

                            return (
                              <div
                                key={`${game}-${gameIndex}`}
                                className={`${gameColorMap.get(game)} transition-all group-hover:brightness-110`}
                                style={{ flex: gamePortion }}
                                title={game}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          className={`h-full ${
                            isBusiestDay
                              ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                              : 'bg-gradient-to-t from-blue-600 to-blue-400'
                          } transition-all group-hover:brightness-110`}
                        />
                      )}

                      {/* Glow effect for busiest day */}
                      {isBusiestDay && (
                        <motion.div
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-purple-400 blur-xl -z-10"
                        />
                      )}

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap border border-white/20">
                          <div className="font-bold mb-1">{day.hours.toFixed(1)}h</div>
                          {day.gameNames.slice(0, 3).map((game, i) => (
                            <div key={i} className="text-white/70">• {game}</div>
                          ))}
                          {day.gameNames.length > 3 && (
                            <div className="text-white/50">+{day.gameNames.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-2 w-full bg-white/5 rounded-lg" />
                  )}
                </div>

                {/* Day label */}
                <div className="text-center">
                  <div
                    className={`text-sm md:text-base font-bold mb-1 ${
                      isBusiestDay ? 'text-purple-400' : 'text-white/70'
                    }`}
                  >
                    {day.day.slice(0, 3)}
                  </div>
                  {isBusiestDay && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.5, type: 'spring' }}
                    >
                      <Zap size={16} className="text-purple-400 mx-auto" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats below */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {data.busiestDay && (
          <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30 text-center">
            <Zap size={24} className="mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold text-purple-300">{data.busiestDay.day}</div>
            <div className="text-sm text-white/50">Busiest Day</div>
            <div className="text-xs text-purple-400 mt-1">{data.busiestDay.hours.toFixed(1)}h</div>
          </div>
        )}

        {data.perfectWeek && (
          <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-500/30 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-lg font-bold text-emerald-300">Perfect Week!</div>
            <div className="text-sm text-white/50">All 7 Days</div>
          </div>
        )}

        {data.restDays.length > 0 && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
            <div className="text-2xl font-bold text-white/70">{data.restDays.length}</div>
            <div className="text-sm text-white/50">Rest Days</div>
            <div className="text-xs text-white/30 mt-1">{data.restDays.join(', ')}</div>
          </div>
        )}
      </motion.div>

      {/* Game legend */}
      {allGames.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <div className="text-xs text-white/50 mb-2 text-center">Games</div>
          <div className="flex flex-wrap justify-center gap-2">
            {allGames.slice(0, 8).map((game, index) => (
              <div key={game} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                <div className={`w-3 h-3 rounded-full ${gameColorMap.get(game)}`} />
                <span className="text-xs text-white/70">{game}</span>
              </div>
            ))}
            {allGames.length > 8 && (
              <div className="px-3 py-1 text-xs text-white/40">
                +{allGames.length - 8} more
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
