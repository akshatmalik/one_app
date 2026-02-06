'use client';

import { motion } from 'framer-motion';
import { Skull, Clock, Package, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface BacklogUpdateScreenProps {
  data: WeekInReviewData;
}

const TIER_EMOJI: Record<string, string> = {
  'Backlog Zero': '🎉',
  'Almost Free': '🏃',
  'Getting There': '📉',
  'Long Haul': '🏔️',
  'Retirement Project': '👴',
  'Heat Death': '💀',
};

const TIER_COLOR: Record<string, string> = {
  'Backlog Zero': '#10b981',
  'Almost Free': '#10b981',
  'Getting There': '#f59e0b',
  'Long Haul': '#f97316',
  'Retirement Project': '#ef4444',
  'Heat Death': '#dc2626',
};

export function BacklogUpdateScreen({ data }: BacklogUpdateScreenProps) {
  const { backlogCount, humorTier, completionRate } = data.backlogStatus;
  const completedThisWeek = data.completedGames.length;
  const newGames = data.newGamesStarted.length;

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <Skull size={32} className="mx-auto mb-3 text-red-400" />
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          Backlog Report
        </h2>
      </motion.div>

      {/* Main tier display */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        <div className="text-5xl mb-3">
          {TIER_EMOJI[humorTier] || '📦'}
        </div>
        <div
          className="text-3xl md:text-4xl font-black"
          style={{ color: TIER_COLOR[humorTier] || '#f59e0b' }}
        >
          {humorTier}
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6"
      >
        <div className="p-3 bg-white/[0.03] rounded-xl">
          <Package size={16} className="mx-auto mb-1 text-orange-400" />
          <div className="text-xl font-bold text-white">{backlogCount}</div>
          <div className="text-[10px] text-white/30">in backlog</div>
        </div>
        <div className="p-3 bg-white/[0.03] rounded-xl">
          <CheckCircle size={16} className="mx-auto mb-1 text-emerald-400" />
          <div className="text-xl font-bold text-emerald-400">{completionRate.toFixed(1)}</div>
          <div className="text-[10px] text-white/30">completed/mo</div>
        </div>
        <div className="p-3 bg-white/[0.03] rounded-xl">
          <Clock size={16} className="mx-auto mb-1 text-blue-400" />
          <div className="text-xl font-bold text-blue-400">{data.totalHours.toFixed(1)}h</div>
          <div className="text-[10px] text-white/30">this week</div>
        </div>
      </motion.div>

      {/* Week impact */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="max-w-sm mx-auto"
      >
        {completedThisWeek > 0 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
            <TrendingDown size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">
              {completedThisWeek} game{completedThisWeek !== 1 ? 's' : ''} completed this week!
            </span>
          </div>
        )}

        {newGames > 0 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-2">
            <TrendingUp size={14} className="text-blue-400" />
            <span className="text-sm text-blue-400">
              {newGames} new game{newGames !== 1 ? 's' : ''} started
            </span>
          </div>
        )}

        {completedThisWeek === 0 && newGames === 0 && (
          <div className="p-3 bg-white/[0.02] rounded-xl">
            <span className="text-sm text-white/40">
              Steady week — no new games added, none completed
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
