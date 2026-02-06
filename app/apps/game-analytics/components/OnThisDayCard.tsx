'use client';

import { useMemo } from 'react';
import { Calendar, ShoppingCart, Play, Trophy, Gamepad2, XCircle } from 'lucide-react';
import { Game } from '../lib/types';
import { getOnThisDay, OnThisDayEvent } from '../lib/calculations';
import clsx from 'clsx';

interface OnThisDayCardProps {
  games: Game[];
}

const EVENT_CONFIG: Record<OnThisDayEvent['eventType'], { icon: typeof Calendar; color: string; label: string }> = {
  purchased: { icon: ShoppingCart, color: 'text-emerald-400', label: 'purchased' },
  started: { icon: Play, color: 'text-blue-400', label: 'started playing' },
  completed: { icon: Trophy, color: 'text-yellow-400', label: 'completed' },
  played: { icon: Gamepad2, color: 'text-purple-400', label: 'played' },
  abandoned: { icon: XCircle, color: 'text-red-400', label: 'abandoned' },
};

export function OnThisDayCard({ games }: OnThisDayCardProps) {
  const events = useMemo(() => getOnThisDay(games), [games]);

  if (events.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={14} className="text-amber-400" />
        <span className="text-xs font-medium text-amber-400">On This Day</span>
      </div>
      <div className="space-y-2">
        {events.slice(0, 3).map((event, i) => {
          const config = EVENT_CONFIG[event.eventType];
          const Icon = config.icon;
          return (
            <div key={`${event.game.id}-${event.eventType}-${i}`} className="flex items-center gap-3">
              {event.game.thumbnail ? (
                <img
                  src={event.game.thumbnail}
                  alt={event.game.name}
                  className="w-8 h-8 object-cover rounded shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-8 h-8 bg-white/5 rounded shrink-0 flex items-center justify-center">
                  <Icon size={12} className={config.color} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-white/70 font-medium truncate">{event.game.name}</span>
                  <span className={clsx('shrink-0', config.color)}>{config.label}</span>
                </div>
                <div className="text-[10px] text-white/40">{event.timeAgo}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
