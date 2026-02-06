'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertTriangle, Gamepad2 } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface CompletionOddsScreenProps {
  data: WeekInReviewData;
}

export function CompletionOddsScreen({ data }: CompletionOddsScreenProps) {
  const odds = data.weekCompletionProbabilities;

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <Target size={32} className="mx-auto mb-3 text-cyan-400" />
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          Completion Odds
        </h2>
        <p className="text-sm text-white/40">
          Will you finish what you played this week?
        </p>
      </motion.div>

      <div className="space-y-3 max-w-sm mx-auto">
        {odds.map((item, i) => (
          <motion.div
            key={item.game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
            className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5"
          >
            {item.game.thumbnail ? (
              <img
                src={item.game.thumbnail}
                alt={item.game.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                <Gamepad2 size={16} className="text-white/20" />
              </div>
            )}

            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-white/80 truncate">{item.game.name}</div>
              <div className="text-[10px] text-white/30">{item.verdict}</div>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 200 }}
              className="shrink-0"
            >
              <div className="relative w-12 h-12">
                {/* Circular progress */}
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke={item.probability >= 70 ? '#10b981' : item.probability >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${item.probability * 0.88} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${
                    item.probability >= 70 ? 'text-emerald-400' :
                    item.probability >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {item.probability}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {odds.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-6 text-xs text-white/30"
        >
          {odds.filter(o => o.probability >= 70).length > 0
            ? `${odds.filter(o => o.probability >= 70).length} game${odds.filter(o => o.probability >= 70).length !== 1 ? 's' : ''} looking strong for completion`
            : odds.filter(o => o.probability >= 40).length > 0
              ? 'Some games could go either way — keep playing!'
              : 'These might need some love to avoid the graveyard'}
        </motion.div>
      )}
    </div>
  );
}
