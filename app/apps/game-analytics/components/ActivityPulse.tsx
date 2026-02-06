'use client';

import { useMemo } from 'react';
import { Game } from '../lib/types';
import { getActivityPulse } from '../lib/calculations';
import clsx from 'clsx';

interface ActivityPulseProps {
  games: Game[];
}

export function ActivityPulse({ games }: ActivityPulseProps) {
  const pulse = useMemo(() => getActivityPulse(games), [games]);

  if (pulse.lastPlayedDaysAgo === Infinity) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <div
          className={clsx('w-2.5 h-2.5 rounded-full', {
            'animate-pulse': pulse.pulseSpeed === 'slow',
          })}
          style={{ backgroundColor: pulse.color }}
        />
        {pulse.pulseSpeed === 'fast' && (
          <div
            className="absolute w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: pulse.color, opacity: 0.5 }}
          />
        )}
        {pulse.pulseSpeed === 'medium' && (
          <div
            className="absolute w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: pulse.color, opacity: 0.3 }}
          />
        )}
      </div>
      <span className="text-xs text-white/40">
        {pulse.level}
        {pulse.daysActive > 0 && ` (${pulse.daysActive}d this week)`}
      </span>
    </div>
  );
}
