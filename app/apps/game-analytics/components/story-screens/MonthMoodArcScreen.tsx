'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { MoodArcPoint } from '../../lib/calculations';

interface MonthMoodArcScreenProps {
  moodArc: MoodArcPoint[];
}

export function MonthMoodArcScreen({ moodArc }: MonthMoodArcScreenProps) {
  if (moodArc.length === 0) return null;

  const moodColors: Record<string, string> = {
    'Intense': 'from-red-500 to-orange-500',
    'Active': 'from-orange-500 to-yellow-500',
    'Moderate': 'from-yellow-500 to-green-500',
    'Light': 'from-green-500 to-cyan-500',
    'Quiet': 'from-cyan-500 to-blue-500',
  };

  const dotColors: Record<string, string> = {
    'Intense': 'bg-red-400',
    'Active': 'bg-orange-400',
    'Moderate': 'bg-yellow-400',
    'Light': 'bg-green-400',
    'Quiet': 'bg-blue-400',
  };

  // SVG path for the mood line
  const width = 280;
  const height = 120;
  const padding = 20;
  const points = moodArc.map((p, i) => ({
    x: padding + (i / (moodArc.length - 1 || 1)) * (width - padding * 2),
    y: height - padding - (p.intensity / 100) * (height - padding * 2),
  }));

  const pathData = points.length > 1
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-2 mb-8"
      >
        <Activity size={16} className="text-white/40" />
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Month Mood Arc</span>
      </motion.div>

      {/* SVG Wave */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <line key={y} x1={padding} y1={height - padding - (y/100) * (height - padding*2)} x2={width - padding} y2={height - padding - (y/100) * (height - padding*2)} stroke="rgba(255,255,255,0.05)" />
          ))}

          {/* Line */}
          {pathData && (
            <motion.path
              d={pathData}
              fill="none"
              stroke="url(#moodGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
            />
          )}

          {/* Gradient */}
          <defs>
            <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={6}
              fill={moodArc[i].intensity >= 60 ? '#ef4444' : moodArc[i].intensity >= 30 ? '#eab308' : '#06b6d4'}
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 6 }}
              transition={{ delay: 0.8 + i * 0.2 }}
            />
          ))}
        </svg>
      </motion.div>

      {/* Week labels */}
      <div className="flex justify-between gap-2">
        {moodArc.map((point, i) => (
          <motion.div
            key={point.weekNum}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 + i * 0.15 }}
            className="flex-1 text-center"
          >
            <div className={`inline-block w-3 h-3 rounded-full mb-1 ${dotColors[point.label] || 'bg-white/30'}`} />
            <div className="text-xs text-white/60 font-medium">Wk {point.weekNum}</div>
            <div className="text-[10px] text-white/30">{point.hours.toFixed(1)}h</div>
            <div className="text-[10px] text-white/40 font-medium">{point.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
