'use client';

import { useState } from 'react';
import { Check, X, PlayCircle, TrendingDown, AlertTriangle } from 'lucide-react';
import { Game } from '../lib/types';
import { getTotalHours, getValueRating } from '../lib/calculations';
import clsx from 'clsx';

interface LiveSessionBannerProps {
  game: Game;
  elapsedSeconds: number;
  elapsedHours: number;
  /** Called with the rounded hours to log; caller creates the PlayLog entry */
  onEnd: (hours: number) => void;
  onDiscard: () => void;
}

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.round(h * 10) / 10}h`;
}

const VALUE_THRESHOLDS = [
  { max: 1, label: 'Excellent', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { max: 3, label: 'Good',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { max: 5, label: 'Fair',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { max: Infinity, label: 'Poor', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
];

function getTierColor(rating: string) {
  return VALUE_THRESHOLDS.find(t => t.label === rating) ?? VALUE_THRESHOLDS[3];
}

export function LiveSessionBanner({ game, elapsedSeconds, elapsedHours, onEnd, onDiscard }: LiveSessionBannerProps) {
  const [confirming, setConfirming] = useState(false);

  const existingHours = getTotalHours(game);
  const totalHours = existingHours + elapsedHours;
  const loggedHours = Math.max(0.1, Math.round(elapsedHours * 10) / 10);

  const liveCph = game.price > 0 && totalHours > 0.01 ? game.price / totalHours : null;
  const valueRating = liveCph !== null ? getValueRating(liveCph) : null;
  const tier = valueRating ? getTierColor(valueRating) : null;

  // Which value threshold do we progress towards next?
  const nextThreshold = game.price > 0
    ? VALUE_THRESHOLDS.find(t => t.max < Infinity && t.max > (liveCph ?? Infinity))
    : null;
  const progressTarget = nextThreshold
    ? { ...nextThreshold, hoursNeeded: game.price / nextThreshold.max }
    : null;
  const progressFraction = progressTarget
    ? Math.min(1, totalHours / progressTarget.hoursNeeded)
    : null;
  const minutesToNext = progressTarget
    ? Math.ceil(Math.max(0, progressTarget.hoursNeeded - totalHours) * 60)
    : null;

  // Warn if session is suspiciously long (>8h – likely left running)
  const isSuspiciouslyLong = elapsedSeconds > 8 * 3600;

  if (confirming) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-500/30 bg-[#0a1a12] overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          {game.thumbnail && (
            <img src={game.thumbnail} alt={game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white/90 truncate">{game.name}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {formatTimer(elapsedSeconds)} session → log <span className="text-emerald-300 font-semibold">{loggedHours}h</span>?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirming(false)}
              className="h-8 px-2 rounded-lg bg-white/5 text-white/30 text-xs font-medium hover:bg-white/10 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => onDiscard()}
              className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1"
            >
              <X size={11} />
              Discard
            </button>
            <button
              onClick={() => onEnd(loggedHours)}
              className="h-8 px-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <Check size={12} />
              Log it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-emerald-500/20 bg-[#071410] overflow-hidden live-session-container">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        {/* Recording indicator + thumbnail */}
        <div className="relative shrink-0">
          {game.thumbnail ? (
            <img src={game.thumbnail} alt={game.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
              <PlayCircle size={18} className="text-emerald-400" />
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 live-dot-pulse border-2 border-[#071410]" />
        </div>

        {/* Label + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-[0.15em]">Live Session</span>
            {isSuspiciouslyLong && (
              <AlertTriangle size={9} className="text-amber-400/70" aria-label="Session running for over 8 hours" />
            )}
          </div>
          <p className="text-sm font-bold text-white/90 truncate mt-0.5">{game.name}</p>
        </div>

        {/* Timer + cost-per-hour */}
        <div className="text-right shrink-0 mr-1">
          <div className={clsx('text-2xl font-black tabular-nums tracking-tight text-emerald-300 live-timer-glow', isSuspiciouslyLong && 'text-amber-300')}>
            {formatTimer(elapsedSeconds)}
          </div>
          {liveCph !== null && (
            <div className="text-xs font-semibold tabular-nums mt-0.5" style={{ color: tier?.color ?? '#94a3b8' }}>
              ${liveCph.toFixed(2)}/hr
              {valueRating && <span className="ml-1 opacity-60">({valueRating})</span>}
            </div>
          )}
        </div>

        {/* End button */}
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 h-9 px-3 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs font-bold hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"
        >
          <Check size={12} />
          End
        </button>
      </div>

      {/* Progress bar toward next value tier */}
      {progressFraction !== null && progressTarget && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/25 flex items-center gap-1">
              <TrendingDown size={9} />
              {minutesToNext !== null && minutesToNext > 0 ? (
                minutesToNext < 60
                  ? `${minutesToNext}m → ${progressTarget.label}`
                  : `${Math.ceil(minutesToNext / 60)}h → ${progressTarget.label}`
              ) : (
                `Almost at ${progressTarget.label}!`
              )}
            </span>
            <span className="text-[10px] font-semibold tabular-nums" style={{ color: tier?.color }}>
              {liveCph !== null ? `$${liveCph.toFixed(2)}/hr` : ''}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-[2s] ease-out"
              style={{ width: `${progressFraction * 100}%`, backgroundColor: progressTarget.color }}
            />
          </div>
        </div>
      )}

      {/* Already at Excellent — just a celebration line */}
      {liveCph !== null && valueRating === 'Excellent' && progressFraction === null && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-emerald-400/60">
            ✓ Excellent value — keep going!
          </p>
        </div>
      )}
    </div>
  );
}

interface LiveStartButtonProps {
  onClick: (e: React.MouseEvent) => void;
  isActive: boolean;
}

export function LiveStartButton({ onClick, isActive }: LiveStartButtonProps) {
  if (isActive) {
    return (
      <div className="h-7 px-2.5 flex items-center gap-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot-pulse" />
        Live
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold bg-white/5 text-white/30 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all shrink-0"
      title="Start a live session timer"
    >
      <PlayCircle size={10} />
      Live
    </button>
  );
}
