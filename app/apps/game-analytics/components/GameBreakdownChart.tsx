'use client';

import { Game } from '../lib/types';
import clsx from 'clsx';

interface GameBreakdownChartProps {
  gamesPlayed: Array<{
    game: Game;
    hours: number;
    sessions: number;
    percentage: number;
    daysPlayed: number;
  }>;
  maxGamesToShow?: number;
}

export function GameBreakdownChart({ gamesPlayed, maxGamesToShow = 5 }: GameBreakdownChartProps) {
  const topGames = gamesPlayed.slice(0, maxGamesToShow);
  const colors = [
    '#8b5cf6', // Purple
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
  ];

  if (topGames.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        No games played this week
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topGames.map((item, index) => (
        <div key={item.game.id} className="space-y-2">
          {/* Game Info Row */}
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              index === 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40'
            )}>
              {index + 1}
            </div>

            {/* Thumbnail */}
            {item.game.thumbnail ? (
              <img
                src={item.game.thumbnail}
                alt={item.game.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0" />
            )}

            {/* Game Name & Stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white truncate">{item.game.name}</h4>
                {item.game.genre && (
                  <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-white/40 shrink-0">
                    {item.game.genre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                <span>{item.hours.toFixed(1)}h</span>
                <span className="text-white/20">•</span>
                <span>{item.sessions} session{item.sessions !== 1 ? 's' : ''}</span>
                <span className="text-white/20">•</span>
                <span>{item.daysPlayed} day{item.daysPlayed !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Percentage */}
            <div className="text-right shrink-0">
              <div className="text-lg font-bold" style={{ color: colors[index % colors.length] }}>
                {item.percentage.toFixed(0)}%
              </div>
              <div className="text-xs text-white/30">of week</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                background: `linear-gradient(90deg, ${colors[index % colors.length]}, ${colors[index % colors.length]}dd)`
              }}
            />
          </div>
        </div>
      ))}

      {/* Summary for remaining games */}
      {gamesPlayed.length > maxGamesToShow && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-sm text-white/40">
            +{gamesPlayed.length - maxGamesToShow} more game{gamesPlayed.length - maxGamesToShow !== 1 ? 's' : ''} played
          </p>
        </div>
      )}
    </div>
  );
}
