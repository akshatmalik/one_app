'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp, X, Gamepad2, Clock, ChevronRight, Zap, Play,
  CheckCircle2, Flame,
} from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getValueRecoveryData,
  ValueRecoveryTarget,
} from '../lib/calculations';
import clsx from 'clsx';

type FilterMode = 'all' | 'quick' | 'active';

const TIER_CONFIG = {
  Excellent: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.14)', label: 'Excellent' },
  Good:      { color: '#93c5fd', bg: 'rgba(147,197,253,0.14)', label: 'Good'      },
  Fair:      { color: '#fde047', bg: 'rgba(253,224,71,0.14)',  label: 'Fair'      },
  Poor:      { color: '#f87171', bg: 'rgba(248,113,113,0.14)', label: 'Poor'      },
} as const;

function formatCPH(cph: number): string {
  return `$${cph.toFixed(2)}/hr`;
}

function pluralHours(h: number): string {
  const rounded = Math.ceil(h * 10) / 10;
  return `${rounded.toFixed(1)}h`;
}

/* ── Progress bar colour based on progress to Good tier ─────────── */
function progressColor(progress: number): string {
  if (progress >= 100) return '#6ee7b7'; // emerald — reached Good
  if (progress >= 60)  return '#93c5fd'; // blue — Fair territory
  if (progress >= 30)  return '#fde047'; // yellow — climbing
  return '#f87171';                      // red — just started
}

/* ── Individual game recovery card ──────────────────────────────── */
function RecoveryCard({
  target,
  onLogTime,
}: {
  target: ValueRecoveryTarget;
  onLogTime: () => void;
}) {
  const { game, currentCPH, currentTier, nextTier, nextTierCPH, hoursToNextTier,
          strandedValue, progressToGood, recentlyPlayed, quickWin, hoursThisMonth } = target;
  const tierCfg = TIER_CONFIG[currentTier];
  const barColor = progressColor(progressToGood);

  return (
    <div className="bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden transition-colors">
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="relative shrink-0">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.name}
              className="w-14 h-14 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <Gamepad2 size={20} className="text-white/15" />
            </div>
          )}
          {/* Current tier badge */}
          <div
            className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-black leading-none border border-[#0d0d1a]"
            style={{ backgroundColor: tierCfg.bg, color: tierCfg.color }}
          >
            {currentTier.slice(0, 4).toUpperCase()}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate leading-tight">{game.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: tierCfg.color }}>
                {formatCPH(currentCPH)} now
              </p>
            </div>
            {/* Log Time button */}
            <button
              onClick={onLogTime}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg transition-all whitespace-nowrap"
            >
              <Play size={10} />
              Log Time
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressToGood}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/35">
                {progressToGood}% toward Good
              </span>
              <span className="text-[10px] text-white/35">
                ${strandedValue.toFixed(0)} stranded
              </span>
            </div>
          </div>

          {/* Target line */}
          {nextTier && hoursToNextTier > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {quickWin && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300 bg-yellow-500/15 rounded-full">
                  <Zap size={8} /> Quick Win
                </span>
              )}
              <span className="text-[11px] text-white/50">
                {pluralHours(hoursToNextTier)} more{' '}
                <span className="text-white/70">→</span>{' '}
                <span style={{ color: TIER_CONFIG[nextTier as keyof typeof TIER_CONFIG]?.color }}>
                  {nextTier}
                </span>{' '}
                <span className="text-white/30">({formatCPH(nextTierCPH)})</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer badges */}
      {(recentlyPlayed || hoursThisMonth > 0) && (
        <div className="flex items-center gap-2 px-3 pb-2.5">
          {recentlyPlayed && (
            <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
              <Flame size={9} /> Active
            </span>
          )}
          {hoursThisMonth > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              <Clock size={9} /> {pluralHours(hoursThisMonth)} this month
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState({ filter }: { filter: FilterMode }) {
  return (
    <div className="text-center py-12">
      <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500/30" />
      <p className="text-white/40 text-sm font-medium">
        {filter === 'quick' ? 'No quick wins right now' :
         filter === 'active' ? 'None of these are active' :
         'All your paid games are at Good value or better'}
      </p>
      <p className="text-white/20 text-xs mt-1">
        {filter === 'all' ? 'Great spending habits!' : 'Try a different filter'}
      </p>
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────────────── */
interface UnlockValueModalProps {
  games: Game[];
  gamesWithMetrics: GameWithMetrics[];
  onClose: () => void;
  onLogTime: (game: GameWithMetrics) => void;
}

export function UnlockValueModal({
  games,
  gamesWithMetrics,
  onClose,
  onLogTime,
}: UnlockValueModalProps) {
  const [filter, setFilter] = useState<FilterMode>('all');

  const data = useMemo(() => getValueRecoveryData(games), [games]);

  const visibleTargets = useMemo((): ValueRecoveryTarget[] => {
    if (filter === 'quick')  return data.targets.filter(t => t.quickWin);
    if (filter === 'active') return data.targets.filter(t => t.recentlyPlayed);
    return data.targets;
  }, [data, filter]);

  // Sort quick wins by hoursToNextTier asc (fastest first)
  const sortedTargets = useMemo((): ValueRecoveryTarget[] => {
    if (filter === 'quick') {
      return [...visibleTargets].sort((a, b) => a.hoursToNextTier - b.hoursToNextTier);
    }
    return visibleTargets;
  }, [visibleTargets, filter]);

  function handleLogTime(target: ValueRecoveryTarget) {
    const gwm = gamesWithMetrics.find(g => g.id === target.game.id);
    if (gwm) {
      onLogTime(gwm);
    }
  }

  const noGames = data.gameCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#0d0d1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">Unlock Your Value</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-white/35">
            Money you paid that more playtime can still justify
          </p>
        </div>

        {/* Hero stats */}
        {!noGames && (
          <div className="shrink-0 px-5 py-4 border-b border-white/5 bg-emerald-500/5">
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-emerald-400 leading-none">
                ${Math.round(data.totalStranded)}
              </span>
              <span className="text-sm text-white/40 mb-0.5 leading-none">stranded</span>
            </div>
            <p className="text-xs text-white/40 mb-3">
              across {data.gameCount} game{data.gameCount !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.quickWinCount > 0 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <Zap size={14} className="text-yellow-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-yellow-300">{data.quickWinCount}</div>
                    <div className="text-[10px] text-white/35 leading-tight">
                      quick win{data.quickWinCount !== 1 ? 's' : ''} (&lt;5h)
                    </div>
                  </div>
                </div>
              )}
              {data.monthlyHoursOnTargets > 0 && (
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <TrendingUp size={14} className="text-blue-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-blue-300">
                      {data.monthlyHoursOnTargets.toFixed(1)}h
                    </div>
                    <div className="text-[10px] text-white/35 leading-tight">logged this month</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {!noGames && (
          <div className="shrink-0 flex gap-1.5 px-5 py-3 border-b border-white/5">
            {([
              { id: 'all',    label: `All (${data.gameCount})` },
              { id: 'quick',  label: `Quick Wins (${data.quickWinCount})` },
              { id: 'active', label: `Active (${data.targets.filter(t => t.recentlyPlayed).length})` },
            ] as { id: FilterMode; label: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/[0.03] text-white/40 border border-transparent hover:text-white/60',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {noGames ? (
            <div className="text-center py-12">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500/30" />
              <p className="text-white/40 text-sm font-medium">Nothing to unlock</p>
              <p className="text-white/20 text-xs mt-1">
                Add paid games to see recovery opportunities
              </p>
            </div>
          ) : sortedTargets.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            sortedTargets.map(target => (
              <RecoveryCard
                key={target.game.id}
                target={target}
                onLogTime={() => handleLogTime(target)}
              />
            ))
          )}
        </div>

        {/* Footer explainer */}
        {!noGames && (
          <div className="shrink-0 px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-white/20 text-center leading-relaxed">
              Stranded value = money paid minus hours played × $3/hr (Good tier threshold).
              Playing more hours brings your cost-per-hour down and unlocks the next value tier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
