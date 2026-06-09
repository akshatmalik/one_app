'use client';

import { useMemo, useState } from 'react';
import { Moon, Zap, X, Clock, SkipForward, Flame } from 'lucide-react';
import { Game } from '../lib/types';
import { getPlayRecommendation } from '../lib/calculations';
import clsx from 'clsx';

interface PlayRecommendationProps {
  games: Game[];
  onQuickLog: (game: Game, hours: number) => void;
  onOpenPlayLog: (game: Game) => void;
  onCardClick: (game: Game) => void;
}

function getTodayDismissKey(): string {
  const now = new Date();
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `ga-play-rec-dismissed-${d}`;
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(getTodayDismissKey()) === 'true';
  } catch {
    return false;
  }
}

function dismissToday(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getTodayDismissKey(), 'true');
  } catch {}
}

export function PlayRecommendation({ games, onQuickLog, onOpenPlayLog, onCardClick }: PlayRecommendationProps) {
  const [dismissed, setDismissed] = useState(() => isDismissedToday());
  const [loggedNow, setLoggedNow] = useState(false);

  const rec = useMemo(() => getPlayRecommendation(games), [games]);

  if (dismissed || loggedNow || !rec) return null;

  const { game, headline, reason, suggestedHours, factors, alternates } = rec;

  const handleDismiss = () => {
    dismissToday();
    setDismissed(true);
  };

  const handleQuickLog = (hours: number) => {
    onQuickLog(game, hours);
    setLoggedNow(true);
  };

  const isStreakCard = factors.isStreak && factors.streakDays >= 3;

  // Suggested log buttons: round to .5, show 2 options
  const logHours: number[] = suggestedHours <= 1
    ? [1, 2]
    : suggestedHours <= 1.5
      ? [1, 1.5]
      : suggestedHours <= 2
        ? [1.5, 2]
        : [2, 3];

  return (
    <div className={clsx(
      'mb-4 rounded-xl border overflow-hidden',
      isStreakCard
        ? 'border-orange-500/25 bg-gradient-to-br from-orange-950/30 to-[#0d0d15]'
        : 'border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-[#0d0d15]',
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {isStreakCard
            ? <Flame size={14} className="text-orange-400" />
            : <Moon size={14} className="text-purple-400" />
          }
          <span className={clsx(
            'text-xs font-semibold uppercase tracking-wider',
            isStreakCard ? 'text-orange-400/70' : 'text-purple-400/70',
          )}>
            Tonight&apos;s Pick
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/20 hover:text-white/50 transition-colors"
          title="Not tonight"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main content */}
      <div className="px-4 pb-4 flex gap-3">
        {/* Thumbnail */}
        <button
          onClick={() => onCardClick(game)}
          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5 hover:opacity-80 transition-opacity"
        >
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl select-none">
              🎮
            </div>
          )}
        </button>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onCardClick(game)}
            className="text-left hover:opacity-80 transition-opacity w-full"
          >
            <div className="text-white font-semibold text-sm leading-tight truncate">{game.name}</div>
            <div className={clsx(
              'text-xs font-medium mt-0.5',
              isStreakCard ? 'text-orange-300/80' : 'text-purple-300/80',
            )}>
              {headline}
            </div>
          </button>

          {reason && (
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed line-clamp-2">
              {reason}
            </p>
          )}

          {/* Chemistry + streak badges */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={clsx(
              'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium',
              factors.chemistry >= 75
                ? 'bg-emerald-500/15 text-emerald-400'
                : factors.chemistry >= 55
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-white/5 text-white/30',
            )}>
              <Zap size={9} />
              {factors.chemistry}% chemistry
            </span>
            {factors.isStreak && factors.streakDays >= 2 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-500/15 text-orange-400">
                🔥 {factors.streakDays}d streak
              </span>
            )}
            {factors.queuePosition === 1 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/15 text-amber-400">
                #1 queue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {logHours.map(h => (
          <button
            key={h}
            onClick={() => handleQuickLog(h)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isStreakCard
                ? 'bg-orange-500/15 text-orange-300 hover:bg-orange-500/25'
                : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25',
            )}
          >
            <Clock size={11} />
            {h % 1 === 0 ? `${h}h` : `${h}h`}
          </button>
        ))}
        <button
          onClick={() => onOpenPlayLog(game)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
        >
          Full log
        </button>
        {alternates.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto text-[10px] text-white/25">
            <SkipForward size={10} />
            {alternates.slice(0, 2).map(alt => (
              <button
                key={alt.id}
                onClick={() => onCardClick(alt)}
                className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors"
                title={alt.name}
              >
                {alt.thumbnail ? (
                  <img src={alt.thumbnail} alt={alt.name} className="w-5 h-5 rounded object-cover" />
                ) : (
                  <span className="text-[10px]">🎮</span>
                )}
                <span className="truncate max-w-[60px]">{alt.name.split(':')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
