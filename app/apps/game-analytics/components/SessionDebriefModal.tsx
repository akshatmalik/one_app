'use client';

import { useEffect, useRef, useState } from 'react';
import { Trophy, Target, X, Zap, Flame, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export interface SessionDebriefData {
  gameName: string;
  gameThumbnail?: string;
  sessionHours: number;
  totalHoursBefore: number;
  totalHoursAfter: number;
  hasCost: boolean;
  costPerHourBefore: number;
  costPerHourAfter: number;
  valueRatingBefore: string;
  valueRatingAfter: string;
  valueTierImproved: boolean;
  newTierLabel: string | null;
  gameStreak: number;
  libraryStreak: number;
  nextMilestone: { description: string; remaining: number; progressPercent: number } | null;
  milestoneAchieved: string | null;
}

const TIER: Record<string, { text: string; glow: string; bg: string; border: string }> = {
  Excellent: {
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  Good: {
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  Fair: {
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
  },
  Poor: {
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
};

function fmtH(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h % 1 === 0) return `${h}h`;
  return `${h.toFixed(1)}h`;
}

function fmtCph(c: number): string {
  if (c <= 0) return '—';
  if (c < 10) return `$${c.toFixed(2)}/hr`;
  return `$${c.toFixed(1)}/hr`;
}

interface Props {
  data: SessionDebriefData;
  onDismiss: () => void;
}

export function SessionDebriefModal({ data, onDismiss }: Props) {
  const AUTO_CLOSE = 7;
  const [countdown, setCountdown] = useState(AUTO_CLOSE);
  const [entered, setEntered] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 16);
    return () => clearTimeout(t);
  }, []);

  // Auto-close countdown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(id);
          dismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const tierStyle = TIER[data.valueRatingAfter] ?? TIER.Fair;
  const cphDropped = data.hasCost && data.costPerHourBefore > 0 && data.costPerHourAfter < data.costPerHourBefore;
  const showValueChange = data.hasCost && data.costPerHourAfter > 0;
  const highlight = data.milestoneAchieved
    ? 'milestone'
    : data.valueTierImproved
    ? 'tier'
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-3 pb-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onDismiss}
    >
      <div
        className={clsx(
          'w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 transition-all ease-out',
          entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
        style={{
          background: 'linear-gradient(180deg, rgb(14,12,26) 0%, rgb(11,10,22) 100%)',
          transitionDuration: '320ms',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Hero banner ── */}
        <div className="relative h-28 overflow-hidden">
          {data.gameThumbnail ? (
            <img
              src={data.gameThumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.35) saturate(1.2)' }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-950 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(14,12,26)] via-[rgba(14,12,26,0.45)] to-transparent" />

          {/* Session stat */}
          <div className="absolute bottom-3 left-4 right-10">
            <p className="text-white/40 text-[11px] mb-0.5 font-medium">Session logged</p>
            <p className="text-white font-black text-3xl leading-none tracking-tight">
              +{fmtH(data.sessionHours)}
            </p>
            <p className="text-white/35 text-xs mt-0.5 truncate">{data.gameName}</p>
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={11} className="text-white/50" />
          </button>
        </div>

        <div className="p-4 space-y-3">

          {/* ── Milestone celebration ── */}
          {highlight === 'milestone' && (
            <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl flex items-center gap-3">
              <Trophy size={20} className="text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-bold text-sm">{data.milestoneAchieved}</p>
                <p className="text-white/30 text-xs">Achievement unlocked</p>
              </div>
              <Sparkles size={14} className="text-yellow-400/60 ml-auto flex-shrink-0" />
            </div>
          )}

          {/* ── Value tier unlock ── */}
          {highlight === 'tier' && (
            <div className={clsx('p-3.5 rounded-xl border flex items-center gap-3', tierStyle.bg, tierStyle.border)}>
              <Zap size={20} className={clsx(tierStyle.text, 'flex-shrink-0')} />
              <div>
                <p className={clsx('font-bold text-sm', tierStyle.text)}>
                  Unlocked: {data.newTierLabel}!
                </p>
                <p className="text-white/30 text-xs">
                  Down to {fmtCph(data.costPerHourAfter)} — great value!
                </p>
              </div>
            </div>
          )}

          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total hours */}
            <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.04]">
              <p className="text-[10px] text-white/30 mb-0.5">Total hrs</p>
              <p className="text-lg font-black text-white">{fmtH(data.totalHoursAfter)}</p>
            </div>

            {/* Cost/hr or "Free" */}
            {showValueChange ? (
              <div className={clsx('rounded-xl p-2.5 text-center border', tierStyle.bg, tierStyle.border)}>
                <p className="text-[10px] text-white/30 mb-0.5">Cost/hr</p>
                <p className={clsx('text-lg font-black', tierStyle.text)}>{fmtCph(data.costPerHourAfter)}</p>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-white/30 mb-0.5">Value</p>
                <p className="text-lg font-black text-emerald-400">Free</p>
              </div>
            )}

            {/* Game streak */}
            <div className={clsx(
              'rounded-xl p-2.5 text-center border',
              data.gameStreak >= 3
                ? 'bg-orange-500/10 border-orange-500/20'
                : 'bg-white/[0.04] border-white/[0.04]'
            )}>
              <p className="text-[10px] text-white/30 mb-0.5">Streak</p>
              <p className={clsx(
                'text-lg font-black',
                data.gameStreak >= 3 ? 'text-orange-400' : 'text-white/50'
              )}>
                {data.gameStreak >= 3 && '🔥'}
                {data.gameStreak}d
              </p>
            </div>
          </div>

          {/* ── Value direction (no tier change but cost dropped) ── */}
          {showValueChange && !data.valueTierImproved && cphDropped && (
            <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-lg">
              <div className="text-xs text-white/30 line-through">{fmtCph(data.costPerHourBefore)}</div>
              <div className="text-white/20 text-sm flex-1 text-center">↓</div>
              <div className={clsx('text-sm font-semibold', tierStyle.text)}>{fmtCph(data.costPerHourAfter)}</div>
              <div className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', tierStyle.bg, tierStyle.text)}>
                {data.valueRatingAfter}
              </div>
            </div>
          )}

          {/* ── Next milestone progress ── */}
          {data.nextMilestone && !data.milestoneAchieved && (
            <div className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-white/35 flex items-center gap-1">
                  <Target size={9} />
                  {data.nextMilestone.description}
                </p>
                <p className="text-[10px] text-white/25">{data.nextMilestone.remaining}h to go</p>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${data.nextMilestone.progressPercent}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Library streak note ── */}
          {data.libraryStreak >= 3 && (
            <p className="text-[10px] text-white/20 text-center flex items-center justify-center gap-1">
              <Flame size={9} className="text-amber-500/50" />
              {data.libraryStreak}-day gaming streak across all games
            </p>
          )}

          {/* ── Auto-close progress ── */}
          <div className="h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-white/15 rounded-full"
              style={{ width: `${(countdown / AUTO_CLOSE) * 100}%`, transition: 'width 1s linear' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
