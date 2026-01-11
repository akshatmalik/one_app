'use client';

import { motion } from 'framer-motion';
import { Film, Book, Tv, DollarSign, Star } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface FunFactsScreenProps {
  data: WeekInReviewData;
}

export function FunFactsScreen({ data }: FunFactsScreenProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full mb-4 backdrop-blur-sm border border-cyan-500/30">
          <Star size={24} className="text-cyan-300" />
          <span className="text-cyan-200 font-bold uppercase tracking-wide">Fun Facts</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Your {data.totalHours.toFixed(1)} hours equals...
        </h2>
      </motion.div>

      {/* Equivalents */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
          className="p-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl border border-purple-500/30 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, duration: 0.6, type: 'spring' }}
          >
            <Film size={48} className="mx-auto mb-4 text-purple-400" />
          </motion.div>
          <div className="text-6xl font-black text-purple-300 mb-3">
            {data.movieEquivalent}
          </div>
          <div className="text-xl font-semibold text-white mb-1">Movies</div>
          <div className="text-sm text-white/50">2 hours each</div>
        </motion.div>

        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
          className="p-8 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl border border-blue-500/30 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
          >
            <Book size={48} className="mx-auto mb-4 text-blue-400" />
          </motion.div>
          <div className="text-6xl font-black text-blue-300 mb-3">
            {data.bookEquivalent}
          </div>
          <div className="text-xl font-semibold text-white mb-1">Books</div>
          <div className="text-sm text-white/50">8 hours each</div>
        </motion.div>

        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6, type: 'spring' }}
          className="p-8 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl border border-cyan-500/30 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.0, duration: 0.6, type: 'spring' }}
          >
            <Tv size={48} className="mx-auto mb-4 text-cyan-400" />
          </motion.div>
          <div className="text-6xl font-black text-cyan-300 mb-3">
            {data.tvEpisodeEquivalent}
          </div>
          <div className="text-xl font-semibold text-white mb-1">TV Episodes</div>
          <div className="text-sm text-white/50">45 minutes each</div>
        </motion.div>
      </div>

      {/* Best value game */}
      {data.bestValueGame && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="p-8 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl border border-emerald-500/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
            >
              <DollarSign size={64} className="text-emerald-400" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm text-emerald-300 font-bold uppercase tracking-wide mb-2">
                Best Value This Week
              </p>
              <h3 className="text-3xl font-bold text-white mb-2">
                {data.bestValueGame.game.name}
              </h3>
              <p className="text-2xl font-bold text-emerald-400">
                ${data.bestValueGame.costPerHour.toFixed(2)} per hour
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Genre diversity */}
      {data.favoriteGenre && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-6 p-6 bg-white/5 rounded-2xl border border-white/10"
        >
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">Favorite Genre</p>
            <p className="text-3xl font-bold text-purple-400 mb-1">{data.favoriteGenre.genre}</p>
            <p className="text-white/50">
              {data.favoriteGenre.hours.toFixed(1)}h • {data.genreDiversityScore}{' '}
              {data.genreDiversityScore === 1 ? 'genre' : 'genres'} total
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
