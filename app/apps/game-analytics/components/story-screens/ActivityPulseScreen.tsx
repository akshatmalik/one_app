'use client';

import { motion } from 'framer-motion';
import { Activity, Shield, Zap, Coffee, Flame } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface ActivityPulseScreenProps {
  data: WeekInReviewData;
}

const PULSE_EMOJI: Record<string, string> = {
  'On Fire': '🔥',
  'Cruising': '🚀',
  'Casual': '🎮',
  'Cooling Off': '❄️',
  'Hibernating': '😴',
};

export function ActivityPulseScreen({ data }: ActivityPulseScreenProps) {
  const pulse = data.activityPulse;
  const guiltFreeX = data.guiltFreeMultiplier;

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      {/* Activity Pulse */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-8"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.1, 1] }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-6xl mb-4"
        >
          {PULSE_EMOJI[pulse.level] || '🎮'}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-sm font-medium uppercase tracking-wider mb-2"
          style={{ color: pulse.color }}
        >
          Activity Status
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-4xl md:text-5xl font-black mb-2"
          style={{ color: pulse.color }}
        >
          {pulse.level}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-white/40 text-sm"
        >
          {pulse.daysActive} active days this week
        </motion.div>
      </motion.div>

      {/* Guilt-Free Gaming */}
      {guiltFreeX > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="mx-auto max-w-xs p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl"
        >
          <Shield size={24} className="mx-auto mb-3 text-purple-400" />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.3, type: 'spring', stiffness: 200 }}
            className="text-3xl font-black text-purple-400 mb-1"
          >
            {guiltFreeX}x
          </motion.div>

          <div className="text-sm text-white/50">
            cheaper than going to the movies
          </div>

          <div className="mt-3 text-xs text-white/30">
            Your gaming cost: ${data.totalCostPerHour > 0 ? data.totalCostPerHour.toFixed(2) : '0'}/hr vs $12/hr movies
          </div>
        </motion.div>
      )}
    </div>
  );
}
