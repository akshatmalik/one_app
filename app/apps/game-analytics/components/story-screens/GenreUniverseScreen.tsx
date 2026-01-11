'use client';

import { motion } from 'framer-motion';
import { Sparkles, Palette } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface GenreUniverseScreenProps {
  data: WeekInReviewData;
}

export function GenreUniverseScreen({ data }: GenreUniverseScreenProps) {
  // Group games by genre and calculate hours
  const genreStats = new Map<string, { hours: number; games: string[] }>();

  data.gamesPlayed.forEach(({ game, hours }) => {
    const genre = game.genre || 'Other';
    const existing = genreStats.get(genre) || { hours: 0, games: [] };
    existing.hours += hours;
    existing.games.push(game.name);
    genreStats.set(genre, existing);
  });

  // Sort by hours and get top genres
  const sortedGenres = Array.from(genreStats.entries())
    .map(([genre, stats]) => ({
      genre,
      hours: stats.hours,
      games: stats.games,
      percentage: (stats.hours / data.totalHours) * 100,
    }))
    .sort((a, b) => b.hours - a.hours);

  const colors = [
    'from-purple-500 to-purple-600',
    'from-blue-500 to-blue-600',
    'from-cyan-500 to-cyan-600',
    'from-emerald-500 to-emerald-600',
    'from-yellow-500 to-yellow-600',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600',
    'from-pink-500 to-pink-600',
  ];

  const maxHeight = Math.max(...sortedGenres.map(g => g.percentage));

  if (sortedGenres.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          No Genre Data
        </h2>
        <p className="text-white/50">Start playing games to see your genre breakdown!</p>
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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mb-3 backdrop-blur-sm border border-purple-500/30">
          <Palette size={18} className="text-purple-300" />
          <span className="text-purple-200 font-bold uppercase tracking-wide text-sm">Genre Universe</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Your Gaming Palette
        </h2>
        <p className="text-white/50 mt-2">
          {sortedGenres.length} genre{sortedGenres.length !== 1 ? 's' : ''} explored
        </p>
      </motion.div>

      {/* Genre Bars */}
      <div className="space-y-4 mb-8">
        {sortedGenres.map((genreData, index) => (
          <motion.div
            key={genreData.genre}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            <div className="flex items-center gap-3">
              {/* Genre Name */}
              <div className="w-24 md:w-32 text-right">
                <div className="text-white font-bold text-sm">{genreData.genre}</div>
                <div className="text-white/40 text-xs">{genreData.hours.toFixed(1)}h</div>
              </div>

              {/* Bar */}
              <div className="flex-1 h-12 bg-white/5 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${genreData.percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 0.8, type: 'spring' }}
                  className={`h-full bg-gradient-to-r ${colors[index % colors.length]} relative`}
                >
                  {/* Shine effect */}
                  <motion.div
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      delay: index * 0.1 + 1,
                      duration: 1.5,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                </motion.div>

                {/* Percentage label */}
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="text-white font-bold text-sm">
                    {genreData.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Game names */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.7 }}
              className="ml-28 md:ml-36 mt-1"
            >
              <div className="text-xs text-white/30 truncate">
                {genreData.games.slice(0, 3).join(', ')}
                {genreData.games.length > 3 && ` +${genreData.games.length - 3}`}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Diversity Score */}
      {data.genreDiversityScore !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-center"
        >
          <Sparkles size={32} className="mx-auto mb-3 text-purple-300" />
          <div className="text-4xl font-black text-purple-300 mb-2">
            {data.genreDiversityScore.toFixed(0)}%
          </div>
          <div className="text-white/70 text-sm mb-1">Diversity Score</div>
          <div className="text-white/40 text-xs">
            {data.genreDiversityScore > 70
              ? '🌈 Ultimate variety seeker!'
              : data.genreDiversityScore > 40
              ? '🎯 Balanced explorer'
              : '💎 Genre specialist'}
          </div>
        </motion.div>
      )}

      {/* Favorite Genre */}
      {data.favoriteGenre && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-center"
        >
          <p className="text-white/70 text-sm">
            Your heart belongs to{' '}
            <span className="text-purple-300 font-bold">{data.favoriteGenre.genre}</span>
            {' '}this week
          </p>
        </motion.div>
      )}
    </div>
  );
}
