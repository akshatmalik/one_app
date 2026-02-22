'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { getStoryArc, StoryActType } from '../lib/calculations';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface StoryArcOverlayProps {
  games: Game[];
  year?: number;
}

const ACT_CONFIG: Record<StoryActType, { color: string; bg: string; dotColor: string }> = {
  setup:      { color: 'text-blue-400',    bg: 'bg-blue-500/20',    dotColor: 'bg-blue-400' },
  rising:     { color: 'text-violet-400',  bg: 'bg-violet-500/20',  dotColor: 'bg-violet-400' },
  climax:     { color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  dotColor: 'bg-yellow-400' },
  falling:    { color: 'text-orange-400',  bg: 'bg-orange-500/20',  dotColor: 'bg-orange-400' },
  resolution: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', dotColor: 'bg-emerald-400' },
};

export function StoryArcOverlay({ games, year }: StoryArcOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const arc = useMemo(() => getStoryArc(games, year), [games, year]);

  if (!arc.hasEnoughData) return null;

  const currentConfig = ACT_CONFIG[arc.currentAct];

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <BookOpen size={14} className="text-white/30 shrink-0" />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-white/60">{arc.yearLabel} Story Arc</span>
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold', currentConfig.bg, currentConfig.color)}>
            {arc.acts.find(a => a.type === arc.currentAct)?.label ?? arc.currentAct}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
      </button>

      {/* Expanded arc detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 space-y-3"
        >
          {/* Narrative sentence */}
          <p className="text-xs text-white/40 leading-relaxed italic">{arc.narrative}</p>

          {/* Arc visual */}
          <div className="relative">
            {/* Arc path (SVG) */}
            <svg
              viewBox="0 0 300 60"
              className="w-full h-12"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="80%" stopColor="#f97316" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Parabolic arc */}
              <path
                d={`M 10,50 Q 150,5 290,50`}
                fill="none"
                stroke="url(#arcGrad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Climax peak dot */}
              <circle cx="150" cy="5" r="4" fill="#f59e0b" opacity="0.9" />
            </svg>

            {/* Act labels below the arc */}
            <div className="flex justify-between mt-1">
              {arc.acts.map(act => {
                const cfg = ACT_CONFIG[act.type];
                return (
                  <div key={act.type} className="flex flex-col items-center gap-0.5">
                    <div className={clsx('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
                    <span className={clsx('text-[9px] font-bold', cfg.color)}>
                      {act.icon}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Act list */}
          <div className="space-y-1.5">
            {arc.acts.map(act => {
              const cfg = ACT_CONFIG[act.type];
              const isCurrent = act.type === arc.currentAct;
              return (
                <div
                  key={act.type}
                  className={clsx(
                    'flex items-start gap-2.5 px-2.5 py-2 rounded-lg',
                    isCurrent ? `${cfg.bg} border border-white/10` : 'opacity-50',
                  )}
                >
                  <span className="text-sm shrink-0">{act.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-xs font-bold', cfg.color)}>
                      {act.label}
                      {isCurrent && <span className="ml-2 text-[9px] text-white/30">← You are here</span>}
                    </div>
                    <div className="text-[10px] text-white/30">{act.description}</div>
                    <div className="text-[9px] text-white/20 mt-0.5">
                      {act.months.join(', ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
