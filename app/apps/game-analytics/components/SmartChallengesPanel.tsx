'use client';

import { useMemo } from 'react';
import { Zap, Flame, Ghost, Map, DollarSign, Package, Target, Check, Clock } from 'lucide-react';
import { Game } from '../lib/types';
import { getSmartWeeklyChallenges, SmartWeeklyChallenge } from '../lib/calculations';
import clsx from 'clsx';

interface SmartChallengesPanelProps {
  games: Game[];
}

const TYPE_ICON: Record<SmartWeeklyChallenge['type'], React.ReactNode> = {
  consistency:     <Flame size={16} />,
  comeback_game:   <Ghost size={16} />,
  genre_explorer:  <Map size={16} />,
  value_seeker:    <DollarSign size={16} />,
  backlog_attack:  <Package size={16} />,
  completion_push: <Target size={16} />,
  personal_best:   <Zap size={16} />,
  deep_dive:       <Target size={16} />,
};

const DIFFICULTY_COLORS = {
  easy:   { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400' },
  medium: { border: 'border-amber-500/30',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   bar: 'bg-amber-500',   badge: 'bg-amber-500/15 text-amber-400' },
  hard:   { border: 'border-red-500/30',     bg: 'bg-red-500/10',     text: 'text-red-400',     bar: 'bg-red-500',     badge: 'bg-red-500/15 text-red-400' },
};

function getDaysUntilMonday(): number {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysUntil = dow === 0 ? 1 : 8 - dow;
  return daysUntil;
}

function ChallengeCard({ challenge }: { challenge: SmartWeeklyChallenge }) {
  const pct = Math.min(100, challenge.targetValue > 0 ? (challenge.currentValue / challenge.targetValue) * 100 : 0);
  const colors = DIFFICULTY_COLORS[challenge.difficulty];
  const isComplete = challenge.isComplete;

  return (
    <div
      className={clsx(
        'p-4 rounded-xl border transition-all',
        isComplete
          ? 'bg-white/[0.03] border-white/10 opacity-70'
          : `${colors.bg} ${colors.border}`,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={clsx(
              'text-lg leading-none shrink-0',
              isComplete && 'grayscale opacity-50',
            )}
          >
            {challenge.icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={clsx(
                  'text-sm font-semibold',
                  isComplete ? 'text-white/40 line-through' : 'text-white',
                )}
              >
                {challenge.title}
              </h4>
              <span
                className={clsx(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0',
                  isComplete ? 'bg-white/5 text-white/20' : colors.badge,
                )}
              >
                {challenge.difficulty}
              </span>
            </div>
            <p className={clsx('text-xs mt-0.5', isComplete ? 'text-white/30' : 'text-white/60')}>
              {challenge.description}
            </p>
          </div>
        </div>

        {/* Complete badge */}
        {isComplete && (
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <Check size={14} className="text-emerald-400" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className={clsx('text-xs font-medium tabular-nums', isComplete ? 'text-white/30' : colors.text)}>
            {challenge.type === 'value_seeker'
              ? `${challenge.currentValue.toFixed(1)} / ${challenge.targetValue}h`
              : challenge.type === 'personal_best' || challenge.type === 'deep_dive'
              ? `${challenge.currentValue.toFixed(1)}h / ${challenge.targetValue}h`
              : `${challenge.currentValue} / ${challenge.targetValue} ${challenge.unit}`}
          </span>
          <span className={clsx('text-[10px] tabular-nums', isComplete ? 'text-white/20' : 'text-white/30')}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-white/20' : colors.bar,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Insight line */}
      <p className={clsx('text-[11px] italic', isComplete ? 'text-white/20' : 'text-white/35')}>
        "{challenge.insight}"
      </p>

      {/* Related game / genre tag */}
      {(challenge.relatedGameName || challenge.relatedGenre) && !isComplete && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] text-white/20 uppercase tracking-wider">
            {challenge.relatedGameName ? 'Game' : 'Genre'}:
          </span>
          <span className="text-[10px] font-medium text-white/40 truncate">
            {challenge.relatedGameName || challenge.relatedGenre}
          </span>
        </div>
      )}
    </div>
  );
}

export function SmartChallengesPanel({ games }: SmartChallengesPanelProps) {
  const challenges = useMemo(() => getSmartWeeklyChallenges(games), [games]);
  const daysUntilReset = getDaysUntilMonday();
  const completedCount = challenges.filter(c => c.isComplete).length;
  const allComplete = completedCount === challenges.length;

  if (games.filter(g => g.status !== 'Wishlist').length === 0) return null;

  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-purple-400" />
          <h2 className="text-base font-semibold text-white">Weekly Challenges</h2>
          {completedCount > 0 && (
            <span
              className={clsx(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                allComplete
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 text-white/40',
              )}
            >
              {completedCount}/{challenges.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/25">
          <Clock size={10} />
          <span>Resets in {daysUntilReset}d</span>
        </div>
      </div>

      {allComplete ? (
        <p className="text-xs text-emerald-400/70 mb-4">
          🎉 All challenges complete this week — you're on a roll!
        </p>
      ) : (
        <p className="text-xs text-white/30 mb-4">
          Auto-generated each Monday from your gaming patterns
        </p>
      )}

      {/* Challenge cards */}
      {challenges.length > 0 ? (
        <div className="space-y-3">
          {challenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Zap size={32} className="mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">Add some games and play sessions to unlock challenges</p>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-white/15 text-center mt-4">
        Challenges are personal and driven by your actual library & play patterns
      </p>
    </div>
  );
}
