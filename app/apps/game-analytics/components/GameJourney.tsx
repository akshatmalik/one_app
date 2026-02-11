'use client';

import { useMemo } from 'react';
import { ShoppingCart, Play, Clock, Trophy, Star, XCircle } from 'lucide-react';
import { Game } from '../lib/types';
import { getGameJourney, JourneyMilestone } from '../lib/calculations';

interface GameJourneyProps {
  game: Game;
}

const typeConfig: Record<string, { icon: typeof Clock; color: string }> = {
  purchase: { icon: ShoppingCart, color: '#a855f7' },
  start: { icon: Play, color: '#3b82f6' },
  session: { icon: Clock, color: '#6b7280' },
  milestone: { icon: Star, color: '#fbbf24' },
  completion: { icon: Trophy, color: '#10b981' },
  abandon: { icon: XCircle, color: '#ef4444' },
};

const sizeMap = { sm: 6, md: 8, lg: 10 };

export function GameJourney({ game }: GameJourneyProps) {
  const milestones = useMemo(() => getGameJourney(game), [game]);

  if (milestones.length === 0) return null;

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-500/30 via-blue-500/20 to-emerald-500/30" />

      <div className="space-y-3">
        {milestones.map((m, i) => {
          const config = typeConfig[m.type] || typeConfig.session;
          const Icon = config.icon;
          const dotSize = sizeMap[m.size];
          const isLast = i === milestones.length - 1;

          return (
            <div key={`${m.date}-${m.type}-${i}`} className="relative flex items-start gap-3">
              {/* Dot */}
              <div
                className={`absolute -left-6 mt-1 rounded-full flex items-center justify-center ${isLast && (m.type === 'session' || m.type === 'milestone') ? 'journey-pulse' : ''}`}
                style={{
                  width: dotSize * 2.5,
                  height: dotSize * 2.5,
                  backgroundColor: `${config.color}20`,
                  marginLeft: -(dotSize * 2.5) / 2 + 11,
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: config.color,
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/60 font-medium">{m.label}</span>
                  <span className="text-[10px] text-white/25 shrink-0">{m.date}</span>
                </div>
                {m.detail && (
                  <p className="text-[10px] text-white/30 italic mt-0.5 truncate">{m.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
