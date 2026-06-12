'use client';

import { useRef } from 'react';
import { X, Quote } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getTotalHours } from '../lib/calculations';
import { formatHours, formatCostPerHour } from '../lib/format';
import { ShareButton } from './ShareButton';
import { RatingStars } from './RatingStars';

interface ReviewCardProps {
  game: GameWithMetrics;
  onClose: () => void;
}

/**
 * Shareable review card — turns a game's written review into a polished image
 * via the shared ShareButton. Reuses existing metrics; no new logic.
 */
export function ReviewCard({ game, onClose }: ReviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hours = getTotalHours(game);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950"
        >
          {/* Hero */}
          <div className="relative h-32">
            {game.thumbnail ? (
              <img src={game.thumbnail} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-indigo-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-3 left-5 right-5">
              <h2 className="text-xl font-bold text-white drop-shadow">{game.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <RatingStars rating={game.rating} size={14} />
                <span className="text-xs text-white/60">{game.rating}/10</span>
              </div>
            </div>
          </div>

          {/* Review */}
          <div className="px-5 pt-4 pb-5">
            <Quote size={20} className="text-purple-400/40 mb-1" />
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap line-clamp-[12]">
              {game.review}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Mini value={formatHours(hours)} label="played" />
              <Mini value={formatCostPerHour(game.metrics.costPerHour)} label="per hour" />
              <Mini value={game.metrics.valueRating} label="value" />
            </div>

            <div className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/25">
              Game Analytics
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors">
            <X size={15} /> Close
          </button>
          <ShareButton targetRef={cardRef} filename={`review-${game.name.replace(/\s+/g, '-').toLowerCase()}`} shareText={`My review of ${game.name} — ${game.rating}/10`} />
        </div>
      </div>
    </div>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}
