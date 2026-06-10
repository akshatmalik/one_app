'use client';

import { useState, useMemo } from 'react';
import {
  Moon, X, Clock, Zap, Flame, ChevronRight, Gamepad2,
  TrendingUp, Star,
} from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getGameChemistry, getTotalHours, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

type TimeSlot = 'quick' | 'standard' | 'long' | 'marathon';

interface PlayTonightResult {
  game: GameWithMetrics;
  score: number;
  chemistryGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  chemistryScore: number;
  reason: string;
  avgSession: number | null;
  timeFit: 'perfect' | 'good' | 'stretch' | 'short';
  isTopPick: boolean;
}

const TIME_SLOTS: Record<TimeSlot, { label: string; emoji: string; minH: number; maxH: number; hint: string }> = {
  quick:    { label: 'Quick',    emoji: '⚡', minH: 0,   maxH: 1,   hint: 'Under 1h' },
  standard: { label: 'Standard', emoji: '🎮', minH: 1,   maxH: 2.5, hint: '1–2.5h' },
  long:     { label: 'Long',     emoji: '🔥', minH: 2.5, maxH: 5,   hint: '2.5–5h' },
  marathon: { label: 'Marathon', emoji: '🏆', minH: 5,   maxH: 99,  hint: '5h+' },
};

const GRADE_STYLE: Record<string, { color: string; bg: string }> = {
  S: { color: '#fde047', bg: 'rgba(253,224,71,0.15)' },
  A: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
  B: { color: '#93c5fd', bg: 'rgba(147,197,253,0.15)' },
  C: { color: '#c4b5fd', bg: 'rgba(196,181,253,0.15)' },
  D: { color: '#fdba74', bg: 'rgba(253,186,116,0.15)' },
};

function timeFitLabel(fit: PlayTonightResult['timeFit'], slot: TimeSlot): string {
  const s = TIME_SLOTS[slot];
  if (fit === 'perfect') return `Fits your ${s.label.toLowerCase()} window`;
  if (fit === 'good')    return `Works for ${s.hint} sessions`;
  if (fit === 'stretch') return 'Sessions usually run longer';
  return 'Short sessions — leaves time to spare';
}

function scoreGame(
  game: Game,
  allGames: Game[],
  slot: TimeSlot,
): { score: number; reason: string; avgSession: number | null; timeFit: PlayTonightResult['timeFit']; chemistryGrade: 'S'|'A'|'B'|'C'|'D'; chemistryScore: number } {
  const chemistry = getGameChemistry(game, allGames);
  let score = chemistry.score;

  const logs = (game.playLogs ?? []).sort((a, b) => b.date.localeCompare(a.date));
  const avgSession = logs.length > 0
    ? logs.reduce((s, l) => s + l.hours, 0) / logs.length
    : null;

  // Time fit
  const { minH, maxH } = TIME_SLOTS[slot];
  let timeFit: PlayTonightResult['timeFit'] = 'good';
  if (avgSession !== null) {
    if (avgSession >= minH && avgSession <= maxH) timeFit = 'perfect';
    else if (avgSession <= maxH * 1.4 && avgSession >= minH * 0.6) timeFit = 'good';
    else if (avgSession > maxH) timeFit = 'stretch';
    else timeFit = 'short';
  }

  if (timeFit === 'perfect') score += 22;
  else if (timeFit === 'good') score += 8;
  else if (timeFit === 'stretch') score -= 18;
  else score -= 4;

  // In-progress bonus
  if (game.status === 'In Progress') score += 14;

  // Recency shaping
  if (logs.length > 0) {
    const daysSince = Math.floor(
      (Date.now() - parseLocalDate(logs[0].date).getTime()) / 86_400_000,
    );
    if (daysSince === 0) score += 6;
    else if (daysSince === 1) score += 10;
    else if (daysSince > 14 && game.status === 'In Progress') score -= 8;
    else if (daysSince > 60) score -= 12;
  }

  // Quality signal
  if (game.rating >= 8 && getTotalHours(game) < 30) score += 5;

  // Build reason sentence
  let reason = chemistry.justification;
  if (game.status === 'In Progress') {
    if (logs.length > 0) {
      const daysSince = Math.floor(
        (Date.now() - parseLocalDate(logs[0].date).getTime()) / 86_400_000,
      );
      if (daysSince === 0) reason = "You're on a roll — keep the momentum";
      else if (daysSince === 1) reason = 'Played yesterday — perfect time to continue';
      else if (daysSince <= 3) reason = 'Still warm — hop back in';
      else if (daysSince > 14) reason = `Back from a ${daysSince}-day break — good moment to return`;
      else reason = 'Already in progress — natural choice';
    } else {
      reason = 'In progress — good time to continue';
    }
  } else if (chemistry.topFactor === 'freshness') {
    reason = 'Untouched — full new-game energy';
  } else if (chemistry.topFactor === 'craving') {
    reason = 'Your genre craving is at a peak right now';
  } else if (chemistry.topFactor === 'seasonal') {
    reason = 'Great match for this time of year';
  } else if (timeFit === 'perfect') {
    reason = timeFitLabel('perfect', slot);
  }

  return {
    score: Math.max(0, Math.min(120, score)),
    reason,
    avgSession,
    timeFit,
    chemistryGrade: chemistry.grade,
    chemistryScore: chemistry.score,
  };
}

interface PlayTonightModalProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  onClose: () => void;
  onOpenGame: (game: GameWithMetrics) => void;
}

export function PlayTonightModal({
  games,
  gamesWithMetrics,
  onClose,
  onOpenGame,
}: PlayTonightModalProps) {
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('standard');

  const eligible = useMemo(() =>
    gamesWithMetrics.filter(
      g => g.status !== 'Wishlist' && g.status !== 'Completed' && g.status !== 'Abandoned',
    ),
  [gamesWithMetrics]);

  const recommendations = useMemo((): PlayTonightResult[] => {
    return eligible
      .map(game => {
        const { score, reason, avgSession, timeFit, chemistryGrade, chemistryScore } =
          scoreGame(game, games, timeSlot);
        return { game, score, chemistryGrade, chemistryScore, reason, avgSession, timeFit, isTopPick: false };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((r, i) => ({ ...r, isTopPick: i === 0 }));
  }, [eligible, games, timeSlot]);

  const topPick = recommendations[0] ?? null;
  const rest = recommendations.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0e0e1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0e0e1a] px-5 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Moon size={18} className="text-indigo-400" />
              <h2 className="text-base font-bold text-white">Play Tonight</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-white/35">Ranked by chemistry, session fit & momentum</p>

          {/* Time selector */}
          <div className="flex gap-1.5 mt-3">
            {(Object.keys(TIME_SLOTS) as TimeSlot[]).map(slot => (
              <button
                key={slot}
                onClick={() => setTimeSlot(slot)}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all',
                  timeSlot === slot
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/35'
                    : 'bg-white/[0.03] text-white/35 border border-transparent hover:text-white/60',
                )}
              >
                <span className="text-sm leading-none">{TIME_SLOTS[slot].emoji}</span>
                <span className="leading-none">{TIME_SLOTS[slot].label}</span>
                <span className={clsx('text-[9px] leading-none', timeSlot === slot ? 'text-indigo-300/60' : 'text-white/20')}>
                  {TIME_SLOTS[slot].hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          {eligible.length === 0 ? (
            <div className="text-center py-10">
              <Gamepad2 size={36} className="mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-sm">No eligible games found</p>
              <p className="text-white/20 text-xs mt-1">Add some owned games to get recommendations</p>
            </div>
          ) : (
            <>
              {/* Top Pick */}
              {topPick && (
                <TopPickCard result={topPick} slot={timeSlot} onOpen={() => onOpenGame(topPick.game)} />
              )}

              {/* Rest */}
              {rest.map((result, i) => (
                <SmallPickCard key={result.game.id} result={result} rank={i + 2} slot={timeSlot} onOpen={() => onOpenGame(result.game)} />
              ))}

            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Top Pick Card ───────────────────────────────────────────── */

function TopPickCard({
  result,
  slot,
  onOpen,
}: {
  result: PlayTonightResult;
  slot: TimeSlot;
  onOpen: () => void;
}) {
  const { game, chemistryGrade, reason, avgSession, timeFit } = result;
  const gradeStyle = GRADE_STYLE[chemistryGrade] ?? GRADE_STYLE.C;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border cursor-pointer group"
      style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))' }}
      onClick={onOpen}
    >
      {/* Top Pick badge */}
      <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 rounded-full border border-indigo-500/30">
        Top Pick
      </div>

      <div className="flex gap-3 p-4">
        {/* Thumbnail */}
        <div className="relative shrink-0">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
              <Gamepad2 size={24} className="text-white/20" />
            </div>
          )}
          {/* Chemistry grade */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-[#0e0e1a]"
            style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.color }}
          >
            {chemistryGrade}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-8">
          <p className="text-sm font-bold text-white/90 leading-tight truncate">{game.name}</p>
          {game.genre && (
            <p className="text-[11px] text-white/30 mt-0.5 truncate">{game.genre}</p>
          )}
          <p className="text-xs text-indigo-300/80 mt-2 leading-snug">{reason}</p>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between px-4 pb-3 pt-0 gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status badge */}
          <StatusBadge status={game.status} />

          {/* Time fit */}
          <TimeFitChip fit={timeFit} avgSession={avgSession} slot={slot} />
        </div>

        <button
          onClick={e => { e.stopPropagation(); onOpen(); }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 rounded-lg transition-all shrink-0"
        >
          Open <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Small Pick Card ─────────────────────────────────────────── */

function SmallPickCard({
  result,
  rank,
  slot,
  onOpen,
}: {
  result: PlayTonightResult;
  rank: number;
  slot: TimeSlot;
  onOpen: () => void;
}) {
  const { game, chemistryGrade, reason, avgSession, timeFit } = result;
  const gradeStyle = GRADE_STYLE[chemistryGrade] ?? GRADE_STYLE.C;

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl border border-white/5 cursor-pointer transition-all group"
      onClick={onOpen}
    >
      {/* Rank number */}
      <span className="text-xs text-white/20 font-bold w-4 text-center shrink-0">{rank}</span>

      {/* Thumbnail */}
      <div className="relative shrink-0">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-11 h-11 rounded-lg object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center">
            <Gamepad2 size={18} className="text-white/20" />
          </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-[1.5px] border-[#0e0e1a]"
          style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.color }}
        >
          {chemistryGrade}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/85 truncate leading-tight">{game.name}</p>
        <p className="text-[11px] text-white/35 mt-0.5 truncate leading-snug">{reason}</p>
      </div>

      {/* Right side */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <TimeFitChip fit={timeFit} avgSession={avgSession} slot={slot} compact />
        <ChevronRight size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  if (status === 'In Progress') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <Zap size={9} />
        In Progress
      </span>
    );
  }
  if (status === 'Not Started') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
        <Star size={9} />
        Fresh Start
      </span>
    );
  }
  return null;
}

function TimeFitChip({
  fit,
  avgSession,
  slot,
  compact = false,
}: {
  fit: PlayTonightResult['timeFit'];
  avgSession: number | null;
  slot: TimeSlot;
  compact?: boolean;
}) {
  const fitColors = {
    perfect: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    good:    { text: 'text-blue-400',    bg: 'bg-blue-500/10' },
    stretch: { text: 'text-orange-400',  bg: 'bg-orange-500/10' },
    short:   { text: 'text-purple-400',  bg: 'bg-purple-500/10' },
  }[fit];

  const fitIcons = {
    perfect: <Flame size={9} />,
    good:    <Clock size={9} />,
    stretch: <TrendingUp size={9} />,
    short:   <Clock size={9} />,
  }[fit];

  if (compact) {
    return (
      <span className={clsx('flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full', fitColors.text, fitColors.bg)}>
        {fitIcons}
        {avgSession !== null ? `~${avgSession.toFixed(1)}h` : '—'}
      </span>
    );
  }

  return (
    <span className={clsx('flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', fitColors.text, fitColors.bg)}>
      {fitIcons}
      {timeFitLabel(fit, slot)}
    </span>
  );
}
