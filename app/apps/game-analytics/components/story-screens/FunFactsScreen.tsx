'use client';

import { motion } from 'framer-motion';
import { Film, Book, Tv, Headphones, Briefcase, Coffee, DollarSign, Star } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface FunFactsScreenProps {
  data: WeekInReviewData;
}

export function FunFactsScreen({ data }: FunFactsScreenProps) {
  const equivalents = [
    {
      icon: Film,
      value: data.movieEquivalent,
      label: 'Movies',
      subLabel: '2hr each',
      color: 'purple',
      gradient: 'from-purple-500/20 to-purple-600/20',
      border: 'border-purple-500/30',
    },
    {
      icon: Tv,
      value: data.tvEpisodeEquivalent,
      label: 'TV Episodes',
      subLabel: '45min each',
      color: 'blue',
      gradient: 'from-blue-500/20 to-blue-600/20',
      border: 'border-blue-500/30',
    },
    {
      icon: Headphones,
      value: data.podcastEquivalent,
      label: 'Podcasts',
      subLabel: '1hr each',
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-cyan-600/20',
      border: 'border-cyan-500/30',
    },
    {
      icon: Book,
      value: data.bookEquivalent,
      label: 'Books',
      subLabel: '8hr each',
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-emerald-600/20',
      border: 'border-emerald-500/30',
    },
    {
      icon: Briefcase,
      value: data.workDaysEquivalent,
      label: 'Work Days',
      subLabel: '8hr each',
      color: 'amber',
      gradient: 'from-amber-500/20 to-amber-600/20',
      border: 'border-amber-500/30',
    },
    {
      icon: Coffee,
      value: data.coffeeShopVisits,
      label: 'Coffee Visits',
      subLabel: '2hr each',
      color: 'orange',
      gradient: 'from-orange-500/20 to-orange-600/20',
      border: 'border-orange-500/30',
    },
  ];

  const colorMap: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 overflow-y-auto max-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full mb-4 backdrop-blur-sm border border-cyan-500/30">
          <Star size={20} className="text-cyan-300" />
          <span className="text-cyan-200 font-bold uppercase tracking-wide text-sm">Fun Comparisons</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Your {data.totalHours.toFixed(1)} hours =
        </h2>
      </motion.div>

      {/* Equivalents grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {equivalents.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5, type: 'spring' }}
            className={`p-4 bg-gradient-to-br ${item.gradient} rounded-xl border ${item.border} text-center`}
          >
            <item.icon size={28} className={`mx-auto mb-2 ${colorMap[item.color]}`} />
            <div className={`text-3xl font-black ${colorMap[item.color]} mb-1`}>
              {item.value}
            </div>
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="text-xs text-white/40">{item.subLabel}</div>
          </motion.div>
        ))}
      </div>

      {/* Best value game */}
      {data.bestValueGame && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="p-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl border border-emerald-500/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <DollarSign size={36} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-300 font-bold uppercase tracking-wide mb-1">
                Best Value This Week
              </p>
              <h3 className="text-lg font-bold text-white truncate">
                {data.bestValueGame.game.name}
              </h3>
              <p className="text-lg font-bold text-emerald-400">
                ${data.bestValueGame.costPerHour.toFixed(2)}/hour
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Netflix binge stat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-center"
      >
        <div className="text-white/50 text-sm mb-1">Instead of gaming, you could have binged</div>
        <div className="text-3xl font-bold text-red-400">{data.netflixBindgeEquivalent} episodes</div>
        <div className="text-xs text-white/30">of your favorite show (25min each)</div>
      </motion.div>

      {/* Fun Gaming Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="mt-6 space-y-3"
      >
        <h3 className="text-xl font-bold text-white text-center mb-4">🎮 Gaming Fuel Stats</h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Pizza */}
          <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 text-center">
            <div className="text-3xl mb-2">🍕</div>
            <div className="text-2xl font-bold text-orange-400">{data.pizzaSlicesEquivalent}</div>
            <div className="text-xs text-white/50">Pizza slices</div>
          </div>

          {/* Energy Drinks */}
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-cyan-400">{data.energyDrinksEquivalent}</div>
            <div className="text-xs text-white/50">Energy drinks</div>
          </div>
        </div>

        {/* Button Presses */}
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <h4 className="text-sm font-medium text-purple-300 mb-1">Epic Button Presses</h4>
          <div className="text-3xl font-black text-purple-400">{data.buttonPressesEstimate.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">That&apos;s a lot of clicking!</div>
        </div>

        {/* Entertainment Value */}
        {data.averageEnjoymentRating > 0 && (
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <h4 className="text-sm font-medium text-emerald-300 mb-1">Entertainment Value Score</h4>
            <div className="text-3xl font-black text-emerald-400">{data.entertainmentValueScore.toFixed(0)}</div>
            <div className="text-xs text-white/40 mt-1">
              {data.totalHours.toFixed(1)}h × {data.averageEnjoymentRating.toFixed(1)} avg rating = pure joy!
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
