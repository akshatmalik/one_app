'use client';

import { useMemo, useState } from 'react';
import { Clock, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import { getDailyPlayPicks, DailyPick } from '../lib/calculations';
import clsx from 'clsx';

interface DailyPlayPicksProps {
  games: GameWithMetrics[];
  onLogTime: (game: GameWithMetrics) => void;
  onOpenGame: (game: GameWithMetrics) => void;
}

function PickCard({
  pick,
  gwm,
  onLogTime,
  onOpenGame,
}: {
  pick: DailyPick;
  gwm: GameWithMetrics;
  onLogTime: (g: GameWithMetrics) => void;
  onOpenGame: (g: GameWithMetrics) => void;
}) {
  return (
    <div
      className="relative flex-shrink-0 w-[160px] sm:w-[176px] rounded-xl border border-white/8 overflow-hidden cursor-pointer group"
      style={{ background: 'rgba(12,12,20,0.95)' }}
      onClick={() => onOpenGame(gwm)}
    >
      {/* Accent bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: pick.accentColor }} />

      {/* Category badge */}
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
        <span className="text-sm leading-none">{pick.categoryEmoji}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: pick.accentColor }}>
          {pick.categoryLabel}
        </span>
      </div>

      {/* Thumbnail */}
      <div className="mx-3 mb-2 rounded-lg overflow-hidden bg-white/5 h-[90px] sm:h-[100px]">
        {pick.game.thumbnail ? (
          <img
            src={pick.game.thumbnail}
            alt={pick.game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🎮</span>
          </div>
        )}
      </div>

      {/* Game name */}
      <div className="px-3 mb-1.5">
        <p className="text-white/90 text-xs font-semibold leading-tight line-clamp-2">{pick.game.name}</p>
      </div>

      {/* Reason */}
      <div className="px-3 mb-1">
        <p className="text-[10px] text-white/50 leading-snug line-clamp-2">{pick.reason}</p>
      </div>

      {/* Subtext */}
      <div className="px-3 mb-3">
        <p className="text-[9px] text-white/25 truncate">{pick.subtext}</p>
      </div>

      {/* Log Time button */}
      <div className="px-3 pb-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogTime(gwm);
          }}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
          style={{
            backgroundColor: `${pick.accentColor}18`,
            color: pick.accentColor,
            border: `1px solid ${pick.accentColor}30`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${pick.accentColor}28`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${pick.accentColor}18`;
          }}
        >
          <Clock size={10} />
          Log Time
        </button>
      </div>
    </div>
  );
}

export function DailyPlayPicks({ games, onLogTime, onOpenGame }: DailyPlayPicksProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-daily-picks-collapsed') === 'true';
  });

  const data = useMemo(() => getDailyPlayPicks(games), [games]);

  // Build a lookup map for GameWithMetrics by game ID
  const gwmById = useMemo(() => {
    const m = new Map<string, GameWithMetrics>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  if (data.picks.length === 0) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('ga-daily-picks-collapsed', String(next));
  };

  // Format today's date nicely
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="mb-4">
      {/* Header row */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-2 w-full text-left"
      >
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        <Zap size={12} className="text-yellow-400/70" />
        <span className="font-medium text-white/50">Today&rsquo;s Picks</span>
        <span className="text-white/25 text-[10px]">— {dateLabel}</span>
        <span className="ml-auto text-[10px] text-white/20">
          {collapsed ? 'show' : 'hide'}
        </span>
      </button>

      {!collapsed && (
        <div className="relative">
          {/* Horizontal scroll row */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
            {data.picks.map(pick => {
              const gwm = gwmById.get(pick.game.id);
              if (!gwm) return null;
              return (
                <div key={pick.game.id} className="snap-start">
                  <PickCard
                    pick={pick}
                    gwm={gwm}
                    onLogTime={onLogTime}
                    onOpenGame={onOpenGame}
                  />
                </div>
              );
            })}

            {/* "Refresh tomorrow" filler card */}
            <div className="flex-shrink-0 w-[120px] flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 border-dashed px-3 py-4 opacity-40">
              <span className="text-2xl">🔮</span>
              <p className="text-[9px] text-white/40 text-center leading-tight">New picks<br />tomorrow</p>
            </div>
          </div>

          {/* Fade-out edge hint for scrollable content */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#0a0a12] to-transparent" />
        </div>
      )}
    </div>
  );
}
