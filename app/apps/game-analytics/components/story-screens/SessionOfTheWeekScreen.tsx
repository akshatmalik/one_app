'use client';

import { motion } from 'framer-motion';
import { Star, Gamepad2 } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface SessionOfTheWeekScreenProps {
  data: WeekInReviewData;
}

export function SessionOfTheWeekScreen({ data }: SessionOfTheWeekScreenProps) {
  if (!data.longestSession) return null;

  const session = data.longestSession;

  // Find the note for this session
  const sessionNote = session.game.playLogs?.find(log => {
    return log.date === session.date && Math.abs(log.hours - session.hours) < 0.01;
  })?.notes;

  // Check if this was a completion session
  const isCompletionSession = session.game.endDate === session.date && session.game.status === 'Completed';

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full mb-3 backdrop-blur-sm border border-amber-500/30">
          <Star size={18} className="text-amber-300" />
          <span className="text-amber-200 font-bold uppercase tracking-wide text-sm">Session of the Week</span>
        </div>
      </motion.div>

      {/* Game thumbnail */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-6"
      >
        {session.game.thumbnail ? (
          <img
            src={session.game.thumbnail}
            alt={session.game.name}
            className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-amber-500/30"
            loading="lazy"
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-white/5 mx-auto flex items-center justify-center border-2 border-amber-500/30">
            <Gamepad2 size={32} className="text-white/20" />
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-white/40 text-sm mb-1">{session.day}</div>
        <div className="text-4xl md:text-5xl font-black text-amber-400 mb-2">
          {session.hours.toFixed(1)}h
        </div>
        <div className="text-xl font-bold text-white mb-1">
          {session.game.name}
        </div>
        {isCompletionSession && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full mt-2"
          >
            <span className="text-emerald-400 text-sm font-bold">Completion Session</span>
          </motion.div>
        )}
      </motion.div>

      {sessionNote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 p-4 bg-white/[0.03] rounded-xl border-l-2 border-amber-500/30 max-w-sm mx-auto"
        >
          <div className="text-xs text-white/30 mb-1">Your note:</div>
          <p className="text-sm text-white/60 italic">&ldquo;{sessionNote}&rdquo;</p>
        </motion.div>
      )}
    </div>
  );
}
