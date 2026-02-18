'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, CheckCircle } from 'lucide-react';
import { Game } from '../lib/types';
import { getFilmstripData, FilmstripFrame } from '../lib/calculations';
import clsx from 'clsx';

interface FilmstripTimelineProps {
  games: Game[];
  className?: string;
}

function FrameCard({ frame, isCenter }: { frame: FilmstripFrame; isCenter: boolean }) {
  return (
    <div
      className={clsx(
        'snap-center shrink-0 w-[200px] sm:w-[220px] rounded-xl border overflow-hidden transition-all duration-300',
        isCenter
          ? 'border-purple-500/30 bg-white/[0.04] scale-100 opacity-100'
          : 'border-white/5 bg-white/[0.02] scale-95 opacity-60',
        frame.isCurrentMonth && 'ring-1 ring-purple-500/20',
      )}
    >
      {/* Hero Image / Period Header */}
      <div className="relative h-[100px] bg-gradient-to-br from-purple-900/30 to-transparent overflow-hidden">
        {frame.heroThumbnail ? (
          <img
            src={frame.heroThumbnail}
            alt=""
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-xs font-bold text-white/90">{frame.periodLabel}</div>
          <div className="text-[10px] text-white/50 truncate">{frame.heroGameName}</div>
        </div>
        {frame.isCurrentMonth && (
          <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 bg-purple-500/30 rounded-full text-purple-300 font-medium">
            NOW
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-3 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-white/40">Hours</span>
          <span className="text-white/70 font-medium">{frame.totalHours}h</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-white/40">Games</span>
          <span className="text-white/70 font-medium">{frame.gameCount}</span>
        </div>
        {(frame.purchaseCount > 0 || frame.completionCount > 0) && (
          <div className="flex items-center gap-2 text-[10px]">
            {frame.purchaseCount > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-400/60">
                <ShoppingCart size={10} /> {frame.purchaseCount}
              </span>
            )}
            {frame.completionCount > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-400/60">
                <CheckCircle size={10} /> {frame.completionCount}
              </span>
            )}
          </div>
        )}

        {/* Mini bar chart of top games */}
        {frame.topGames.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-white/5">
            {frame.topGames.slice(0, 3).map((game, i) => {
              const barWidth = frame.totalHours > 0 ? (game.hours / frame.totalHours) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500/40"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[8px] text-white/30 shrink-0 w-8 text-right">{game.hours}h</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function FilmstripTimeline({ games, className }: FilmstripTimelineProps) {
  const frames = useMemo(() => getFilmstripData(games), [games]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIndex, setCenterIndex] = useState(-1);

  // Scroll to the current month (or last frame) on mount
  useEffect(() => {
    if (scrollRef.current && frames.length > 0) {
      const currentIdx = frames.findIndex(f => f.isCurrentMonth);
      const targetIdx = currentIdx >= 0 ? currentIdx : frames.length - 1;
      const cardWidth = 220; // approximate width + gap
      scrollRef.current.scrollLeft = targetIdx * cardWidth - scrollRef.current.clientWidth / 2 + cardWidth / 2;
      setCenterIndex(targetIdx);
    }
  }, [frames]);

  // Track scroll position to determine center card
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = 220;
      const center = el.scrollLeft + el.clientWidth / 2;
      const idx = Math.round(center / cardWidth);
      setCenterIndex(Math.min(Math.max(idx, 0), frames.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [frames.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (frames.length === 0) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">No monthly data yet</p>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-white/50">Monthly Filmstrip</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Filmstrip scroll area */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Left spacer for centering first card */}
        <div className="shrink-0 w-[calc(50%-110px)]" />

        {frames.map((frame, i) => (
          <FrameCard key={frame.period} frame={frame} isCenter={i === centerIndex} />
        ))}

        {/* Right spacer for centering last card */}
        <div className="shrink-0 w-[calc(50%-110px)]" />
      </div>
    </div>
  );
}
