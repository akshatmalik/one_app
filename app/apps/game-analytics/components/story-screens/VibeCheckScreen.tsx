'use client';

import { motion } from 'framer-motion';
import { WeekInReviewData } from '../../lib/calculations';

interface VibeCheckScreenProps {
  data: WeekInReviewData;
}

export function VibeCheckScreen({ data }: VibeCheckScreenProps) {
  // Calculate intensity score 0-100
  const { totalHours, totalSessions, daysActive, marathonSessions, vsAverage } = data;

  // Factors:
  // - Hours (more = hotter): 0-40h maps to 0-40 points
  // - Sessions per day: high frequency = hotter
  // - Days active: more = hotter
  // - Marathon sessions: boost intensity
  // - vs average: above average = hotter

  let intensity = 0;
  intensity += Math.min(40, totalHours * 1.5); // up to 40 pts
  intensity += Math.min(15, (totalSessions / 7) * 7.5); // sessions/day, up to 15 pts
  intensity += (daysActive / 7) * 15; // up to 15 pts
  intensity += Math.min(15, marathonSessions * 5); // up to 15 pts
  intensity += Math.min(15, Math.max(0, (vsAverage.percentage - 100) / 10)); // above average, up to 15 pts

  intensity = Math.max(0, Math.min(100, intensity));

  // Determine vibe label and color
  let vibeLabel: string;
  let vibeEmoji: string;
  let markerColor: string;

  if (intensity < 15) {
    vibeLabel = 'Zen Mode';
    vibeEmoji = '🧘';
    markerColor = 'bg-blue-400';
  } else if (intensity < 30) {
    vibeLabel = 'Casual Vibes';
    vibeEmoji = '😌';
    markerColor = 'bg-cyan-400';
  } else if (intensity < 50) {
    vibeLabel = 'Steady Flow';
    vibeEmoji = '🎮';
    markerColor = 'bg-green-400';
  } else if (intensity < 70) {
    vibeLabel = 'Locked In';
    vibeEmoji = '🔥';
    markerColor = 'bg-yellow-400';
  } else if (intensity < 85) {
    vibeLabel = 'Beast Mode';
    vibeEmoji = '💪';
    markerColor = 'bg-orange-400';
  } else {
    vibeLabel = 'Absolute Unit';
    vibeEmoji = '🤯';
    markerColor = 'bg-red-400';
  }

  // Gradient stops for the bar
  const gradientStops = [
    { pos: 0, color: '#3b82f6' },    // blue
    { pos: 20, color: '#06b6d4' },   // cyan
    { pos: 40, color: '#22c55e' },   // green
    { pos: 60, color: '#eab308' },   // yellow
    { pos: 80, color: '#f97316' },   // orange
    { pos: 100, color: '#ef4444' },  // red
  ];

  return (
    <div className="w-full max-w-lg mx-auto text-center flex flex-col items-center justify-center">
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Vibe Check</span>
      </motion.div>

      {/* Big emoji + label */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
        className="mb-2"
      >
        <span className="text-7xl">{vibeEmoji}</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-3xl font-black text-white mb-8"
      >
        {vibeLabel}
      </motion.h2>

      {/* Gradient bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-sm mb-4"
        style={{ transformOrigin: 'left' }}
      >
        <div className="relative h-4 rounded-full overflow-hidden"
          style={{ background: `linear-gradient(to right, ${gradientStops.map(s => `${s.color} ${s.pos}%`).join(', ')})` }}
        >
          {/* Marker */}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${intensity}%` }}
            transition={{ delay: 1.0, duration: 1.0, ease: 'easeOut' }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          >
            <div className={`w-6 h-6 rounded-full ${markerColor} border-2 border-white shadow-lg`} />
          </motion.div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between mt-2 text-[10px] text-white/30">
          <span>Chill</span>
          <span>Moderate</span>
          <span>Intense</span>
        </div>
      </motion.div>

      {/* Intensity number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-4"
      >
        <span className="text-5xl font-black text-transparent bg-clip-text"
          style={{ backgroundImage: `linear-gradient(to right, ${gradientStops.map(s => `${s.color} ${s.pos}%`).join(', ')})` }}
        >
          {Math.round(intensity)}
        </span>
        <span className="text-lg text-white/40 ml-1">/100</span>
      </motion.div>
    </div>
  );
}
