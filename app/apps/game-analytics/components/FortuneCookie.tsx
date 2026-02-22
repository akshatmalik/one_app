'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { getDailyFortune, DailyFortune } from '../lib/calculations';
import { Game } from '../lib/types';

interface FortuneCookieProps {
  games: Game[];
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  spending: { bg: 'from-emerald-500/10 to-green-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  time: { bg: 'from-blue-500/10 to-cyan-500/10', text: 'text-blue-300', border: 'border-blue-500/20' },
  completion: { bg: 'from-emerald-500/10 to-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/20' },
  backlog: { bg: 'from-orange-500/10 to-amber-500/10', text: 'text-orange-300', border: 'border-orange-500/20' },
  value: { bg: 'from-yellow-500/10 to-amber-500/10', text: 'text-yellow-300', border: 'border-yellow-500/20' },
  streak: { bg: 'from-red-500/10 to-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20' },
  genre: { bg: 'from-purple-500/10 to-violet-500/10', text: 'text-purple-300', border: 'border-purple-500/20' },
  prediction: { bg: 'from-pink-500/10 to-fuchsia-500/10', text: 'text-pink-300', border: 'border-pink-500/20' },
};

export function FortuneCookie({ games }: FortuneCookieProps) {
  const [fortune, setFortune] = useState<DailyFortune | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cracked, setCracked] = useState(false);

  useEffect(() => {
    if (games.length === 0) return;
    // Check if already dismissed today
    const today = new Date().toDateString();
    const dismissedOn = typeof window !== 'undefined' ? localStorage.getItem('fortune-cookie-dismissed') : null;
    if (dismissedOn === today) {
      setDismissed(true);
      return;
    }
    const f = getDailyFortune(games);
    setFortune(f);
  }, [games]);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    if (typeof window !== 'undefined') localStorage.setItem('fortune-cookie-dismissed', today);
    setDismissed(true);
  };

  if (dismissed || !fortune) return null;

  const colors = categoryColors[fortune.category] ?? categoryColors.prediction;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className={`relative flex items-start gap-3 px-4 py-3 bg-gradient-to-r ${colors.bg} rounded-xl border ${colors.border} overflow-hidden`}
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
          aria-label="Dismiss fortune"
        >
          <X size={12} />
        </button>

        {/* Cookie icon */}
        {!cracked ? (
          <motion.button
            onClick={() => setCracked(true)}
            whileTap={{ scale: 0.9, rotate: 5 }}
            className="shrink-0 text-2xl cursor-pointer select-none"
            title="Crack the fortune cookie"
          >
            🥠
          </motion.button>
        ) : (
          <motion.span
            initial={{ scale: 1.4, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="shrink-0 text-2xl"
          >
            {fortune.icon}
          </motion.span>
        )}

        <div className="flex-1 min-w-0 pr-4">
          <AnimatePresence mode="wait">
            {!cracked ? (
              <motion.p
                key="teaser"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-white/40 italic"
              >
                Your daily gaming fortune awaits... tap the cookie 🥠
              </motion.p>
            ) : (
              <motion.div
                key="fortune"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={10} className={colors.text} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>
                    Daily Fortune
                  </span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{fortune.text}</p>
                <p className="text-[10px] text-white/25 mt-1">{fortune.dataPoint}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
