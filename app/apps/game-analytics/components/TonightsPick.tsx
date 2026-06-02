'use client';

import { useMemo, useState } from 'react';
import { Gamepad2, Flame, Clock, ChevronDown, ChevronUp, Zap, RotateCcw, TrendingUp, Star, Moon } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  getTonightsPick,
  TonightsPickReason,
  TonightsPickSuggestion,
} from '../lib/calculations';

interface TonightsPickProps {
  games: Game[];
  onLogTime: (game: Game) => void;
}

const REASON_CONFIG: Record<TonightsPickReason, { icon: React.ReactNode; color: string; bg: string }> = {
  momentum:         { icon: <TrendingUp size={11} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  completion_close: { icon: <Star size={11} />,       color: 'text-yellow-400',  bg: 'bg-yellow-500/10'  },
  your_day:         { icon: <Moon size={11} />,       color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  streak_risk:      { icon: <Flame size={11} />,      color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
  comeback:         { icon: <RotateCcw size={11} />,  color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  new_start:        { icon: <Zap size={11} />,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10'    },
};

function SuggestionRow({
  suggestion,
  onLogTime,
  rank,
}: {
  suggestion: TonightsPickSuggestion;
  onLogTime: (game: Game) => void;
  rank: number;
}) {
  const { game, reasonTag, reasonText, subText, estimatedSessionHours } = suggestion;
  const cfg = REASON_CONFIG[reasonTag];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-all group">
      {/* Rank */}
      <div className="text-[10px] font-bold text-white/20 w-3 shrink-0 text-center">{rank}</div>

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white/5">
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <Gamepad2 size={18} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white/85 truncate leading-tight">{game.name}</div>

        {/* Reason chip */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border', cfg.color, cfg.bg, 'border-current/20')}>
            {cfg.icon}
            {reasonText}
          </span>
        </div>

        {subText && (
          <div className="text-[10px] text-white/30 mt-0.5 truncate">{subText}</div>
        )}
      </div>

      {/* Session estimate + action */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-white/30">
          <Clock size={10} />
          <span>~{estimatedSessionHours}h</span>
        </div>
        <button
          onClick={() => onLogTime(game)}
          className="px-2.5 py-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all whitespace-nowrap"
        >
          Log Time
        </button>
      </div>
    </div>
  );
}

export function TonightsPick({ games, onLogTime }: TonightsPickProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ga-tonights-pick-collapsed') === 'true';
  });

  const data = useMemo(() => getTonightsPick(games), [games]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ga-tonights-pick-collapsed', String(next));
    }
  };

  // Only render when there's something meaningful to show
  if (data.suggestions.length === 0) return null;

  const hasContext = data.todayAvgHours > 0 || data.todayTopGenre;

  return (
    <div className="mb-4">
      {/* Header row */}
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full text-left mb-2 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-white/40 group-hover:text-white/60 transition-colors tracking-wide uppercase">
            Tonight&apos;s Pick
          </span>
          {/* Day context badge */}
          {hasContext && !collapsed && (
            <span className="text-[10px] text-white/25">
              · {data.todayDayName}
              {data.todayAvgHours > 0 && ` · you average ${data.todayAvgHours}h`}
              {data.todayTopGenre && data.todayAvgHours === 0 && ` · ${data.todayTopGenre} days`}
            </span>
          )}
        </div>
        <div className="text-white/25 group-hover:text-white/50 transition-colors">
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </div>
      </button>

      {!collapsed && (
        <div className="space-y-1.5">
          {/* Streak risk banner */}
          {data.streakAtRisk && !data.hasPlayedToday && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-2">
              <Flame size={13} className="text-orange-400 shrink-0" />
              <span className="text-xs text-orange-300/90">
                Your <span className="font-semibold">{data.currentStreak}-day streak</span> is at risk — play anything tonight to keep it going
              </span>
            </div>
          )}

          {/* Suggestions */}
          {data.suggestions.map((suggestion, i) => (
            <SuggestionRow
              key={suggestion.game.id}
              suggestion={suggestion}
              onLogTime={onLogTime}
              rank={i + 1}
            />
          ))}

          {/* Already played today note */}
          {data.hasPlayedToday && (
            <div className="text-center pt-1">
              <span className="text-[10px] text-emerald-500/60">✓ You&apos;ve already played today</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
