'use client';

import { motion } from 'framer-motion';
import { Clock, Gamepad2 } from 'lucide-react';
import { HistoricalEcho } from '../../lib/calculations';

interface ThisTimeLastYearScreenProps {
  echoes: HistoricalEcho[];
}

export function ThisTimeLastYearScreen({ echoes }: ThisTimeLastYearScreenProps) {
  if (echoes.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-full mb-3 backdrop-blur-sm border border-rose-500/30">
          <Clock size={18} className="text-rose-300" />
          <span className="text-rose-200 font-bold uppercase tracking-wide text-sm">Time Capsule</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          This Time Last Year...
        </h2>
      </motion.div>

      <div className="space-y-4">
        {echoes.map((echo, index) => (
          <motion.div
            key={`${echo.game.id}-${echo.label}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.2 }}
            className="p-4 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-xl border border-rose-500/20"
          >
            <div className="text-xs text-rose-400/60 font-bold uppercase tracking-wide mb-3">
              {echo.label}
            </div>
            <div className="flex items-center gap-3">
              {echo.game.thumbnail ? (
                <img
                  src={echo.game.thumbnail}
                  alt={echo.game.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                  <Gamepad2 size={20} className="text-white/20" />
                </div>
              )}
              <div>
                <p className="text-white font-medium">
                  You {echo.event}{' '}
                  <span className="text-rose-300">{echo.game.name}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {echo.hours.toFixed(1)}h played
                </p>
              </div>
            </div>
            {echo.review && (
              <div className="mt-3 px-3 py-2 bg-white/[0.03] rounded-lg border-l-2 border-rose-500/30">
                <p className="text-xs text-white/40 italic">&ldquo;{echo.review}&rdquo;</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
