'use client';

import { motion } from 'framer-motion';
import { Clock, Zap, Coffee, Flame } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface SessionTypesScreenProps {
  data: WeekInReviewData;
}

export function SessionTypesScreen({ data }: SessionTypesScreenProps) {
  const total = data.marathonSessions + data.powerSessions + data.quickSessions;

  const marathonPercent = total > 0 ? (data.marathonSessions / total) * 100 : 0;
  const powerPercent = total > 0 ? (data.powerSessions / total) * 100 : 0;
  const quickPercent = total > 0 ? (data.quickSessions / total) * 100 : 0;

  // Determine session style
  let sessionStyle = '';
  let sessionEmoji = '';
  if (marathonPercent >= 50) {
    sessionStyle = 'Marathon Gamer';
    sessionEmoji = '';
  } else if (powerPercent >= 50) {
    sessionStyle = 'Power Player';
    sessionEmoji = '';
  } else if (quickPercent >= 50) {
    sessionStyle = 'Quick Hitter';
    sessionEmoji = '';
  } else {
    sessionStyle = 'Balanced Player';
    sessionEmoji = '';
  }

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full mb-4 backdrop-blur-sm border border-orange-500/30">
          <Clock size={20} className="text-orange-300" />
          <span className="text-orange-200 font-bold uppercase tracking-wide text-sm">Session Style</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          How You Play
        </h2>
      </motion.div>

      {/* Session type bars */}
      <div className="space-y-4 mb-8">
        {/* Marathon Sessions (3h+) */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative"
        >
          <div className="flex items-center gap-3 mb-2">
            <Flame size={20} className="text-red-400" />
            <span className="text-white font-medium flex-1 text-left">Marathon (3h+)</span>
            <span className="text-red-400 font-bold">{data.marathonSessions}</span>
          </div>
          <div className="h-8 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${marathonPercent}%` }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full flex items-center justify-end pr-3"
            >
              {marathonPercent > 15 && (
                <span className="text-xs font-bold text-white">{marathonPercent.toFixed(0)}%</span>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Power Sessions (1-3h) */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative"
        >
          <div className="flex items-center gap-3 mb-2">
            <Zap size={20} className="text-purple-400" />
            <span className="text-white font-medium flex-1 text-left">Power (1-3h)</span>
            <span className="text-purple-400 font-bold">{data.powerSessions}</span>
          </div>
          <div className="h-8 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${powerPercent}%` }}
              transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-end pr-3"
            >
              {powerPercent > 15 && (
                <span className="text-xs font-bold text-white">{powerPercent.toFixed(0)}%</span>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Sessions (<1h) */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative"
        >
          <div className="flex items-center gap-3 mb-2">
            <Coffee size={20} className="text-cyan-400" />
            <span className="text-white font-medium flex-1 text-left">Quick (&lt;1h)</span>
            <span className="text-cyan-400 font-bold">{data.quickSessions}</span>
          </div>
          <div className="h-8 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${quickPercent}%` }}
              transition={{ delay: 1.0, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-cyan-600 to-emerald-500 rounded-full flex items-center justify-end pr-3"
            >
              {quickPercent > 15 && (
                <span className="text-xs font-bold text-white">{quickPercent.toFixed(0)}%</span>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Session style badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6, type: 'spring' }}
        className="p-5 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl border border-purple-500/30"
      >
        <div className="text-4xl mb-2">{sessionEmoji}</div>
        <div className="text-2xl font-bold text-white mb-1">{sessionStyle}</div>
        <div className="text-sm text-white/50">
          Average session: <span className="text-purple-400 font-semibold">{data.avgSessionLength.toFixed(1)}h</span>
        </div>
      </motion.div>

      {/* Longest session */}
      {data.longestSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10"
        >
          <div className="text-xs text-white/40 mb-1">Longest Session</div>
          <div className="text-white font-medium">{data.longestSession.game.name}</div>
          <div className="text-sm text-orange-400">{data.longestSession.hours.toFixed(1)}h on {data.longestSession.day}</div>
        </motion.div>
      )}
    </div>
  );
}
