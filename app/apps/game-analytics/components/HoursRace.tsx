'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getScopedRacingBarData,
  getRacingBarHighlights,
  RacingBarFrame,
  RacingBarHighlight,
  RacingBarScope,
} from '../lib/calculations';
import clsx from 'clsx';

interface HoursRaceProps {
  games: Game[];
  maxBars?: number;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 3] as const;

const SCOPE_CONFIG: Record<RacingBarScope, { label: string }> = {
  month: { label: 'Month' },
  year: { label: 'Year' },
  alltime: { label: 'All Time' },
};

export function HoursRace({ games, maxBars = 10, className }: HoursRaceProps) {
  const now = new Date();
  const [scope, setScope] = useState<RacingBarScope>('month');
  const [scopeMonth, setScopeMonth] = useState(now.getMonth() > 0 ? now.getMonth() - 1 : 11);
  const [scopeYear, setScopeYear] = useState(now.getMonth() > 0 ? now.getFullYear() : now.getFullYear() - 1);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = useMemo(() =>
    getScopedRacingBarData(games, scope, scopeMonth, scopeYear),
    [games, scope, scopeMonth, scopeYear]
  );

  const highlights = useMemo(() => getRacingBarHighlights(frames), [frames]);

  const highlightsByPeriod = useMemo(() => {
    const map: Record<string, RacingBarHighlight[]> = {};
    highlights.forEach(h => {
      if (!map[h.period]) map[h.period] = [];
      map[h.period].push(h);
    });
    return map;
  }, [highlights]);

  // Reset frame index when scope/navigation changes
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [scope, scopeMonth, scopeYear]);

  const currentFrame = frames[currentFrameIndex] as RacingBarFrame | undefined;
  const currentHighlights = currentFrame ? (highlightsByPeriod[currentFrame.period] || []) : [];

  const maxHours = useMemo(() => {
    let max = 0;
    frames.forEach(f => {
      f.games.forEach(g => {
        if (g.cumulativeHours > max) max = g.cumulativeHours;
      });
    });
    return max || 1;
  }, [frames]);

  // Playback — faster for year/alltime since there are more frames
  const advanceFrame = useCallback(() => {
    setCurrentFrameIndex(prev => {
      if (prev >= frames.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [frames.length]);

  useEffect(() => {
    if (isPlaying) {
      const baseInterval = scope === 'month' ? 800 : scope === 'year' ? 200 : 100;
      const interval = baseInterval / playbackSpeed;
      animationRef.current = setTimeout(advanceFrame, interval);
    }
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isPlaying, currentFrameIndex, playbackSpeed, advanceFrame, scope]);

  const togglePlay = () => {
    if (currentFrameIndex >= frames.length - 1) {
      setCurrentFrameIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  };

  // Navigation for month scope
  const canGoForwardMonth = !(scopeYear === now.getFullYear() && scopeMonth >= now.getMonth());
  const canGoForwardYear = scopeYear < now.getFullYear();

  const goBackMonth = () => {
    if (scopeMonth === 0) { setScopeMonth(11); setScopeYear(y => y - 1); }
    else setScopeMonth(m => m - 1);
  };
  const goForwardMonth = () => {
    if (scopeMonth === 11) { setScopeMonth(0); setScopeYear(y => y + 1); }
    else setScopeMonth(m => m + 1);
  };
  const goBackYear = () => setScopeYear(y => y - 1);
  const goForwardYear = () => setScopeYear(y => y + 1);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  if (frames.length === 0) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">
          {scope === 'month'
            ? `No gaming activity in ${monthNames[scopeMonth]} ${scopeYear}`
            : scope === 'year'
            ? `No gaming activity in ${scopeYear}`
            : 'Log play sessions to see games race!'}
        </p>
      </div>
    );
  }

  const visibleGames = currentFrame ? currentFrame.games.slice(0, maxBars) : [];

  const featuredHighlight = currentHighlights.find(h => h.type === 'overtake')
    || currentHighlights.find(h => h.type === 'completion')
    || currentHighlights.find(h => h.type === 'milestone')
    || currentHighlights.find(h => h.type === 'new_entry')
    || currentHighlights.find(h => h.type === 'dominant_month')
    || null;

  const accentColor = scope === 'month' ? 'cyan' : scope === 'year' ? 'purple' : 'amber';

  return (
    <div className={clsx('p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl', className)}>
      {/* Header with scope toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/50">Hours Race</h3>

        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {(['month', 'year', 'alltime'] as RacingBarScope[]).map(s => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                if (s === 'month') {
                  setScopeMonth(now.getMonth() > 0 ? now.getMonth() - 1 : 11);
                  setScopeYear(now.getMonth() > 0 ? now.getFullYear() : now.getFullYear() - 1);
                }
                if (s === 'year') setScopeYear(now.getFullYear());
              }}
              className={clsx(
                'px-2.5 py-1 rounded-md text-[10px] font-medium transition-all',
                scope === s
                  ? s === 'month' ? 'bg-cyan-500/20 text-cyan-400'
                  : s === 'year' ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-amber-500/20 text-amber-400'
                  : 'text-white/30 hover:text-white/60'
              )}
            >
              {SCOPE_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigation for month scope */}
      {scope === 'month' && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={goBackMonth} className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-white/70 min-w-[140px] text-center">
            {monthNames[scopeMonth]} {scopeYear}
          </span>
          <button
            onClick={goForwardMonth}
            disabled={!canGoForwardMonth}
            className={clsx('p-1.5 rounded transition-colors', canGoForwardMonth ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-white/10 cursor-not-allowed')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Period navigation for year scope */}
      {scope === 'year' && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={goBackYear} className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-white/70 min-w-[60px] text-center">
            {scopeYear}
          </span>
          <button
            onClick={goForwardYear}
            disabled={!canGoForwardYear}
            className={clsx('p-1.5 rounded transition-colors', canGoForwardYear ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-white/10 cursor-not-allowed')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Current frame label + total hours in top-right */}
      {currentFrame && (
        <div className="flex items-center justify-between mb-2">
          <div className={clsx(
            'text-sm font-semibold',
            accentColor === 'cyan' ? 'text-cyan-400/80' : accentColor === 'purple' ? 'text-purple-400/80' : 'text-amber-400/80'
          )}>
            {currentFrame.periodLabel}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-white/20" />
            <span className={clsx(
              'text-sm font-bold tabular-nums',
              accentColor === 'cyan' ? 'text-cyan-400' : accentColor === 'purple' ? 'text-purple-400' : 'text-amber-400'
            )}>
              {currentFrame.totalHours.toFixed(1)}h
            </span>
            {scope !== 'month' && (
              <span className="text-[9px] text-white/20">30d</span>
            )}
          </div>
        </div>
      )}

      {/* Highlight banner */}
      <div className="h-7 mb-3">
        {featuredHighlight && (
          <div className={clsx(
            'text-xs font-medium px-3 py-1 rounded-full inline-flex items-center gap-1.5 animate-fade-in',
            featuredHighlight.type === 'overtake' && 'bg-yellow-500/10 text-yellow-400',
            featuredHighlight.type === 'completion' && 'bg-emerald-500/10 text-emerald-400',
            featuredHighlight.type === 'milestone' && 'bg-purple-500/10 text-purple-400',
            featuredHighlight.type === 'new_entry' && 'bg-blue-500/10 text-blue-400',
            featuredHighlight.type === 'dominant_month' && 'bg-orange-500/10 text-orange-400',
          )}>
            {featuredHighlight.type === 'overtake' && '🏆'}
            {featuredHighlight.type === 'completion' && '✅'}
            {featuredHighlight.type === 'milestone' && '⭐'}
            {featuredHighlight.type === 'new_entry' && '🆕'}
            {featuredHighlight.type === 'dominant_month' && '🔥'}
            {featuredHighlight.description}
          </div>
        )}
      </div>

      {/* Racing bars */}
      <div className="space-y-1.5 min-h-[240px] sm:min-h-[320px]">
        {visibleGames.map((entry) => {
          const barWidth = maxHours > 0 ? (entry.cumulativeHours / maxHours) * 100 : 0;
          const isActive = entry.hoursThisPeriod > 0;
          const overtook = entry.previousRank > 0 && entry.rank < entry.previousRank;

          return (
            <div
              key={entry.gameId}
              className="flex items-center gap-2 transition-all duration-300 ease-in-out"
              style={{
                opacity: entry.isNew ? 0.9 : 1,
                animation: entry.isNew ? 'cardSlideUp 0.4s ease-out' : undefined,
              }}
            >
              {/* Rank */}
              <div className={clsx(
                'w-5 text-right text-xs font-mono shrink-0',
                entry.rank === 1 ? 'text-yellow-400 font-bold' : 'text-white/30',
              )}>
                {entry.rank}
              </div>

              {/* Thumbnail */}
              <div className="w-6 h-6 rounded shrink-0 overflow-hidden bg-white/5">
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: entry.color + '40' }} />
                )}
              </div>

              {/* Name + Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] text-white/70 truncate max-w-[100px] sm:max-w-[140px]">
                    {entry.gameName}
                  </span>
                  {entry.justCompleted && <span className="text-[9px] text-emerald-400">✓</span>}
                  {overtook && isPlaying && <span className="text-[9px] text-yellow-400 animate-pulse">▲</span>}
                </div>
                <div className="relative h-5 bg-white/[0.03] rounded overflow-hidden">
                  <div
                    className={clsx(
                      'absolute inset-y-0 left-0 rounded transition-all duration-300 ease-in-out',
                      isActive && 'racing-bar-active',
                    )}
                    style={{
                      width: `${Math.max(barWidth, 1)}%`,
                      backgroundColor: entry.color,
                      opacity: isActive ? 0.9 : 0.5,
                    }}
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <span className="text-[10px] font-mono text-white/60">
                      {entry.cumulativeHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Playback Controls */}
      <div className="mt-4 space-y-3">
        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={Math.max(frames.length - 1, 0)}
          value={currentFrameIndex}
          onChange={e => {
            setIsPlaying(false);
            setCurrentFrameIndex(Number(e.target.value));
          }}
          className={clsx(
            'w-full h-1.5 rounded-full appearance-none cursor-pointer',
            'bg-white/10',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg',
            accentColor === 'cyan' && '[&::-webkit-slider-thumb]:bg-cyan-400',
            accentColor === 'purple' && '[&::-webkit-slider-thumb]:bg-purple-400',
            accentColor === 'amber' && '[&::-webkit-slider-thumb]:bg-amber-400',
          )}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(0); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronFirst size={16} />
            </button>
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(prev => Math.max(prev - 1, 0)); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={togglePlay}
              className={clsx(
                'p-2 rounded-full transition-colors',
                isPlaying
                  ? accentColor === 'cyan' ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                    : accentColor === 'purple' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                    : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/15',
              )}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(prev => Math.min(prev + 1, frames.length - 1)); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <SkipForward size={14} />
            </button>
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(frames.length - 1); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLast size={16} />
            </button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={clsx(
                  'px-2 py-0.5 text-[10px] font-mono rounded transition-colors',
                  playbackSpeed === speed
                    ? accentColor === 'cyan' ? 'bg-cyan-500/20 text-cyan-400'
                      : accentColor === 'purple' ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-amber-500/20 text-amber-400'
                    : 'text-white/30 hover:text-white/50',
                )}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Counter */}
          <div className="text-[10px] text-white/20 font-mono">
            {currentFrameIndex + 1}/{frames.length}
          </div>
        </div>
      </div>
    </div>
  );
}
