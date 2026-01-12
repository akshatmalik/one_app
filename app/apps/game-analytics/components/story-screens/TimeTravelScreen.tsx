'use client';

import { motion } from 'framer-motion';
import { Clock, Film, Book, Tv, Headphones, Coffee, Moon } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface TimeTravelScreenProps {
  data: WeekInReviewData;
}

export function TimeTravelScreen({ data }: TimeTravelScreenProps) {
  const equivalents = [
    {
      icon: <Film size={24} className="text-red-400" />,
      value: data.movieEquivalent,
      label: 'Movies',
      emoji: '🎬',
      color: 'from-red-500/20 to-red-600/20 border-red-500/30',
    },
    {
      icon: <Tv size={24} className="text-blue-400" />,
      value: data.tvEpisodeEquivalent,
      label: 'TV Episodes',
      emoji: '📺',
      color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    },
    {
      icon: <Book size={24} className="text-amber-400" />,
      value: data.bookEquivalent,
      label: 'Books',
      emoji: '📚',
      color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
    },
    {
      icon: <Headphones size={24} className="text-purple-400" />,
      value: data.podcastEquivalent,
      label: 'Podcast Episodes',
      emoji: '🎙️',
      color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    },
    {
      icon: <Coffee size={24} className="text-orange-400" />,
      value: data.workDaysEquivalent,
      label: 'Work Days',
      emoji: '💼',
      color: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    },
    {
      icon: <Moon size={24} className="text-indigo-400" />,
      value: data.sleepCyclesEquivalent,
      label: 'Sleep Cycles',
      emoji: '😴',
      color: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full mb-3 backdrop-blur-sm border border-cyan-500/30">
          <Clock size={18} className="text-cyan-300" />
          <span className="text-cyan-200 font-bold uppercase tracking-wide text-sm">Time Travel</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          You Could Have...
        </h2>
        <p className="text-white/50">
          Your <span className="text-cyan-300 font-bold">{data.totalHours.toFixed(1)} hours</span> in perspective
        </p>
      </motion.div>

      {/* Equivalents Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {equivalents.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.1 + 0.3,
              type: 'spring',
              bounce: 0.5,
            }}
            className={`p-6 bg-gradient-to-br ${item.color} rounded-2xl border relative overflow-hidden group`}
          >
            {/* Background emoji */}
            <div className="absolute top-2 right-2 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
              {item.emoji}
            </div>

            {/* Icon */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              className="mb-3"
            >
              {item.icon}
            </motion.div>

            {/* Value */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.6, type: 'spring' }}
              className="text-4xl font-black text-white mb-2"
            >
              {item.value.toFixed(1)}
            </motion.div>

            {/* Label */}
            <div className="text-white/70 text-sm font-medium">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Fun Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-center"
      >
        <div className="text-5xl mb-3">⏰</div>
        <h3 className="text-xl font-bold text-white mb-2">
          That&apos;s {(data.totalHours * 60).toFixed(0)} Minutes!
        </h3>
        <p className="text-white/60 text-sm">
          Or {(data.totalHours * 3600).toLocaleString()} seconds of pure gaming joy
        </p>
      </motion.div>

      {/* Netflix Binge */}
      {data.netflixBindgeEquivalent > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center"
        >
          <p className="text-white/70 text-sm">
            You could&apos;ve binged{' '}
            <span className="text-red-300 font-bold">
              {data.netflixBindgeEquivalent.toFixed(1)} episodes
            </span>
            {' '}of your favorite show! 📺
          </p>
        </motion.div>
      )}

      {/* Gym Sessions */}
      {data.gymSessionsEquivalent > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center"
        >
          <p className="text-white/70 text-sm">
            Or hit the gym for{' '}
            <span className="text-emerald-300 font-bold">
              {data.gymSessionsEquivalent.toFixed(1)} sessions
            </span>
            {' '}💪 (but games are more fun!)
          </p>
        </motion.div>
      )}
    </div>
  );
}
