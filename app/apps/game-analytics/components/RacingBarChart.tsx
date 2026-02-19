'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast } from 'lucide-react';
import { Game } from '../lib/types';
import { getRacingBarChartData, getRacingBarHighlights, RacingBarFrame, RacingBarHighlight } from '../lib/calculations';
import clsx from 'clsx';

interface RacingBarChartProps {
  games: Game[];
  maxBars?: number;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 3] as const;

export function RacingBarChart({ games, maxBars = 10, className }: RacingBarChartProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = useMemo(() => getRacingBarChartData(games), [games]);
  const highlights = useMemo(() => getRacingBarHighlights(frames), [frames]);

  // Map highlights by period for quick lookup
  const highlightsByPeriod = useMemo(() => {
    const map: Record<string, RacingBarHighlight[]> = {};
    highlights.forEach(h => {
      if (!map[h.period]) map[h.period] = [];
      map[h.period].push(h);
    });
    return map;
  }, [highlights]);

  const currentFrame = frames[currentFrameIndex] as RacingBarFrame | undefined;
  const currentHighlights = currentFrame ? (highlightsByPeriod[currentFrame.period] || []) : [];

  // Find the max cumulative hours across all frames for consistent bar scaling
  const maxHours = useMemo(() => {
    let max = 0;
    frames.forEach(f => {
      f.games.forEach(g => {
        if (g.cumulativeHours > max) max = g.cumulativeHours;
      });
    });
    return max || 1;
  }, [frames]);

  // Playback logic
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
      const interval = 1500 / playbackSpeed;
      animationRef.current = setTimeout(advanceFrame, interval);
    }
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isPlaying, currentFrameIndex, playbackSpeed, advanceFrame]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIndex(prev => Math.min(prev + 1, frames.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [frames.length]);

  const togglePlay = () => {
    if (currentFrameIndex >= frames.length - 1) {
      // Restart from beginning
      setCurrentFrameIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  };

  if (frames.length === 0) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">Log more play sessions to see your gaming history race!</p>
      </div>
    );
  }

  const visibleGames = currentFrame ? currentFrame.games.slice(0, maxBars) : [];

  // Pick the most interesting highlight to show
  const featuredHighlight = currentHighlights.find(h => h.type === 'overtake')
    || currentHighlights.find(h => h.type === 'completion')
    || currentHighlights.find(h => h.type === 'milestone')
    || currentHighlights.find(h => h.type === 'new_entry')
    || currentHighlights.find(h => h.type === 'dominant_month')
    || null;

  return (
    <div className={clsx('p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/50">Hours Race</h3>
        {currentFrame && (
          <div className="text-right">
            <div className="text-lg sm:text-xl font-bold text-white/90 tracking-tight">
              {currentFrame.periodLabel}
            </div>
          </div>
        )}
      </div>

      {/* Highlight Banner */}
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

      {/* Bar Chart Area */}
      <div className="space-y-1.5 min-h-[280px] sm:min-h-[360px]">
        {visibleGames.map((entry, i) => {
          const barWidth = maxHours > 0 ? (entry.cumulativeHours / maxHours) * 100 : 0;
          const isActive = entry.hoursThisPeriod > 0;
          const overtook = entry.previousRank > 0 && entry.rank < entry.previousRank;

          return (
            <div
              key={entry.gameId}
              className="flex items-center gap-2 transition-all duration-700 ease-in-out"
              style={{
                opacity: entry.isNew ? 0.9 : 1,
                animation: entry.isNew ? 'cardSlideUp 0.5s ease-out' : undefined,
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
                  <img
                    src={entry.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: entry.color + '40' }}
                  />
                )}
              </div>

              {/* Name + Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] text-white/70 truncate max-w-[100px] sm:max-w-[140px]">
                    {entry.gameName}
                  </span>
                  {entry.justCompleted && (
                    <span className="text-[9px] text-emerald-400">✓</span>
                  )}
                  {overtook && isPlaying && (
                    <span className="text-[9px] text-yellow-400 animate-pulse">▲</span>
                  )}
                </div>
                {/* Bar */}
                <div className="relative h-5 bg-white/[0.03] rounded overflow-hidden">
                  <div
                    className={clsx(
                      'absolute inset-y-0 left-0 rounded transition-all duration-700 ease-in-out',
                      isActive && 'racing-bar-active',
                    )}
                    style={{
                      width: `${Math.max(barWidth, 1)}%`,
                      backgroundColor: entry.color,
                      opacity: isActive ? 0.9 : 0.5,
                    }}
                  />
                  {/* Hours label inside bar */}
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
        <div className="relative">
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentFrameIndex}
            onChange={e => {
              setIsPlaying(false);
              setCurrentFrameIndex(Number(e.target.value));
            }}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Jump to start */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(0); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
              title="Jump to start"
            >
              <ChevronFirst size={16} />
            </button>
            {/* Step back */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(prev => Math.max(prev - 1, 0)); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
              title="Step back"
            >
              <SkipBack size={14} />
            </button>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className={clsx(
                'p-2 rounded-full transition-colors',
                isPlaying
                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/15',
              )}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {/* Step forward */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(prev => Math.min(prev + 1, frames.length - 1)); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
              title="Step forward"
            >
              <SkipForward size={14} />
            </button>
            {/* Jump to end */}
            <button
              onClick={() => { setIsPlaying(false); setCurrentFrameIndex(frames.length - 1); }}
              className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
              title="Jump to end"
            >
              <ChevronLast size={16} />
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={clsx(
                  'px-2 py-0.5 text-[10px] font-mono rounded transition-colors',
                  playbackSpeed === speed
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-white/30 hover:text-white/50',
                )}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Frame counter */}
          <div className="text-[10px] text-white/20 font-mono">
            {currentFrameIndex + 1}/{frames.length}
          </div>
        </div>
      </div>
    </div>
  );
}
