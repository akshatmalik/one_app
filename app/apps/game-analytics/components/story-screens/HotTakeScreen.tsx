'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { WeekInReviewData } from '../../lib/calculations';

interface HotTakeScreenProps {
  hotTake: string;
}

export function getHotTake(data: WeekInReviewData): string | null {
  const { totalHours, uniqueGames, topGame, gamesPlayed, marathonSessions, totalSessions, daysActive, vsLastWeek, vsAverage } = data;

  if (totalHours === 0) return null;

  const takes: string[] = [];

  // Time comparisons
  if (topGame && topGame.hours > 20) {
    takes.push(`${topGame.hours.toFixed(0)} hours on ${topGame.game.name} this week. That's a part-time job.`);
  }
  if (topGame && topGame.percentage > 80 && uniqueGames > 1) {
    takes.push(`You played ${uniqueGames} games but ${topGame.game.name} got ${topGame.percentage.toFixed(0)}% of your time. The others were just warm-ups.`);
  }
  if (totalHours > 40) {
    takes.push(`${totalHours.toFixed(0)} hours of gaming this week. Some people don't even work that much.`);
  } else if (totalHours > 25) {
    takes.push(`${totalHours.toFixed(0)} hours this week. Gaming isn't your hobby — it's your second career.`);
  }

  // Session patterns
  if (marathonSessions >= 3) {
    takes.push(`${marathonSessions} marathon sessions this week. Your couch has a permanent imprint of you.`);
  }
  if (totalSessions >= 14) {
    takes.push(`${totalSessions} sessions in 7 days. That's ${(totalSessions / 7).toFixed(1)} gaming sessions per day.`);
  }
  if (daysActive >= 7) {
    takes.push(`You gamed every single day this week. Rest days are for other people, apparently.`);
  }

  // Comparison takes
  if (vsLastWeek.trend === 'up' && vsLastWeek.hoursDiff > 10) {
    takes.push(`${vsLastWeek.hoursDiff.toFixed(0)} more hours than last week. Something clearly unlocked in your brain.`);
  }
  if (vsAverage.percentage > 200) {
    takes.push(`You played ${(vsAverage.percentage / 100).toFixed(1)}x your usual weekly average. Are you okay?`);
  }

  // One-game obsession
  if (uniqueGames === 1 && topGame) {
    takes.push(`Only ${topGame.game.name}. All week. Nothing else. This is what commitment looks like.`);
  }

  // Low activity but still gaming
  if (totalHours < 2 && totalSessions >= 3) {
    takes.push(`${totalSessions} sessions averaging ${(totalHours / totalSessions * 60).toFixed(0)} minutes each. The definition of "just one more quick round."`);
  }

  // Genre-specific
  if (gamesPlayed.length > 0) {
    const genres = [...new Set(gamesPlayed.map(g => g.game.genre).filter(Boolean))];
    if (genres.length === 1 && genres[0]) {
      takes.push(`Every game this week was ${genres[0]}. You know other genres exist, right?`);
    }
    if (genres.length >= 5) {
      takes.push(`${genres.length} different genres this week. You're not a gamer, you're a genre tourist.`);
    }
  }

  if (takes.length === 0) return null;

  // Pick a random take for variety
  return takes[Math.floor(Math.random() * takes.length)];
}

export function HotTakeScreen({ hotTake }: HotTakeScreenProps) {
  return (
    <div className="w-full max-w-lg mx-auto text-center flex flex-col items-center justify-center">
      {/* Flame icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
          <Flame size={40} className="text-orange-400" />
        </div>
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-orange-400/60">Hot Take</span>
      </motion.div>

      {/* The take */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-2xl md:text-3xl font-bold text-white leading-snug"
      >
        {hotTake}
      </motion.p>
    </div>
  );
}
