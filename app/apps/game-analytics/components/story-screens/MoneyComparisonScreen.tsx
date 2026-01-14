'use client';

import { motion } from 'framer-motion';
import { DollarSign, Popcorn, UtensilsCrossed, Music, Dumbbell, Plane, ShoppingBag, Coffee } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface MoneyComparisonScreenProps {
  data: WeekInReviewData;
}

export function MoneyComparisonScreen({ data }: MoneyComparisonScreenProps) {
  // Calculate costs based on hours
  const movieTheaterCost = Math.round((data.totalHours / 2) * 15); // $15 per 2hr movie
  const restaurantCost = Math.round((data.totalHours / 1.5) * 35); // $35 per 1.5hr meal
  const concertCost = Math.round((data.totalHours / 3) * 80); // $80 per 3hr concert
  const gymCost = Math.round((data.totalHours / 1) * 12); // $12 per hour at gym
  const coffeeCost = Math.round((data.totalHours / 2) * 8); // $8 per 2hr coffee shop visit
  const streamingCost = Math.round((data.totalHours / 160) * 15); // $15/month for ~160hrs

  // Calculate actual gaming spend this week
  const actualGamingSpend = data.totalValueUtilized || 0;
  const totalAlternativeCost = movieTheaterCost + restaurantCost + concertCost;
  const moneySaved = totalAlternativeCost - actualGamingSpend;

  const comparisons = [
    {
      icon: Popcorn,
      label: 'Movie Tickets',
      cost: movieTheaterCost,
      color: 'purple',
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      textColor: 'text-purple-400',
    },
    {
      icon: UtensilsCrossed,
      label: 'Eating Out',
      cost: restaurantCost,
      color: 'orange',
      gradient: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-500/30',
      textColor: 'text-orange-400',
    },
    {
      icon: Music,
      label: 'Concert Tickets',
      cost: concertCost,
      color: 'pink',
      gradient: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-500/30',
      textColor: 'text-pink-400',
    },
    {
      icon: Dumbbell,
      label: 'Gym Sessions',
      cost: gymCost,
      color: 'blue',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      textColor: 'text-blue-400',
    },
    {
      icon: Coffee,
      label: 'Coffee Shops',
      cost: coffeeCost,
      color: 'amber',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-500/30',
      textColor: 'text-amber-400',
    },
    {
      icon: ShoppingBag,
      label: 'Shopping',
      cost: Math.round(totalAlternativeCost * 0.6),
      color: 'green',
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
      textColor: 'text-green-400',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 overflow-y-auto max-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full mb-4 backdrop-blur-sm border border-green-500/30">
          <DollarSign size={20} className="text-green-300" />
          <span className="text-green-200 font-bold uppercase tracking-wide text-sm">Money Saved</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          What You Could Have Spent
        </h2>
        <p className="text-white/60">
          In {data.totalHours.toFixed(1)} hours of entertainment this week
        </p>
      </motion.div>

      {/* Main savings callout */}
      {moneySaved > 0 && actualGamingSpend >= 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-6 p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 backdrop-blur-sm"
        >
          <div className="text-center">
            <p className="text-sm text-green-300 font-medium mb-2">🎉 You Saved</p>
            <div className="text-5xl font-black text-green-400 mb-2">
              ${moneySaved.toLocaleString()}
            </div>
            <p className="text-sm text-white/60">
              Gaming cost you ${actualGamingSpend.toFixed(0)} this week vs ${totalAlternativeCost.toLocaleString()}+ on other entertainment
            </p>
          </div>
        </motion.div>
      )}

      {/* Cost comparisons grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {comparisons.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.5, type: 'spring' }}
            className={`p-4 bg-gradient-to-br ${item.gradient} rounded-xl border ${item.border} backdrop-blur-sm`}
          >
            <item.icon size={24} className={`mb-2 ${item.textColor}`} />
            <div className={`text-3xl font-black ${item.textColor} mb-1`}>
              ${item.cost}
            </div>
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="text-xs text-white/40">for {data.totalHours.toFixed(1)}h</div>
          </motion.div>
        ))}
      </div>

      {/* Bottom insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="p-4 bg-white/5 rounded-xl border border-white/10"
      >
        <div className="text-center">
          <p className="text-white/70 text-sm leading-relaxed">
            Gaming gives you incredible entertainment value. While other hobbies have their place,
            your gaming sessions delivered{' '}
            <span className="text-purple-400 font-bold">{data.totalHours.toFixed(1)} hours</span> of
            immersive entertainment at a fraction of the cost. 🎮
          </p>
        </div>
      </motion.div>

      {/* Cost per hour comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="mt-6 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20"
      >
        <h3 className="text-lg font-bold text-white mb-4 text-center">
          💰 Cost Per Hour Comparison
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Gaming</span>
            <span className="text-green-400 font-bold">
              ${actualGamingSpend > 0 ? (actualGamingSpend / data.totalHours).toFixed(2) : '0.00'}/hr
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Movie Theater</span>
            <span className="text-white/50 font-bold">$7.50/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Restaurant</span>
            <span className="text-white/50 font-bold">$23.33/hr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Concert</span>
            <span className="text-white/50 font-bold">$26.67/hr</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
