'use client';

import { useState, useMemo } from 'react';
import { X, Clock, Star, DollarSign, TrendingUp, Calendar, ListPlus, Check, Heart, Edit3, Trash2, ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getTotalHours,
  getCompletionProbability,
  getValueOverTime,
  getValueTrajectory,
  getFranchiseInfo,
  getGameSmartOneLiner,
  getROIRating,
  getRelativeTime,
  parseLocalDate,
  getProgressPercent,
  calculateCostPerHour,
} from '../lib/calculations';
import clsx from 'clsx';

interface GameDetailPanelProps {
  game: GameWithMetrics;
  allGames: Game[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogTime: () => void;
  onToggleQueue: () => void;
  onToggleSpecial: () => void;
  isInQueue: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Completed': return 'bg-emerald-500/20 text-emerald-400';
    case 'In Progress': return 'bg-blue-500/20 text-blue-400';
    case 'Not Started': return 'bg-white/10 text-white/60';
    case 'Wishlist': return 'bg-purple-500/20 text-purple-400';
    case 'Abandoned': return 'bg-red-500/20 text-red-400';
    default: return 'bg-white/10 text-white/60';
  }
}

function getValueColor(rating: string): string {
  switch (rating) {
    case 'Excellent': return 'text-emerald-400';
    case 'Good': return 'text-blue-400';
    case 'Fair': return 'text-yellow-400';
    case 'Poor': return 'text-red-400';
    default: return 'text-white/50';
  }
}

export function GameDetailPanel({
  game,
  allGames,
  onClose,
  onEdit,
  onDelete,
  onLogTime,
  onToggleQueue,
  onToggleSpecial,
  isInQueue,
}: GameDetailPanelProps) {
  const [showAllSessions, setShowAllSessions] = useState(false);

  const totalHours = game.totalHours;
  const completionProb = useMemo(() => getCompletionProbability(game, allGames), [game, allGames]);
  const valueOverTime = useMemo(() => getValueOverTime(game), [game]);
  const valTraj = useMemo(() => getValueTrajectory(game), [game]);
  const franchise = useMemo(() => getFranchiseInfo(game, allGames), [game, allGames]);
  const smartLine = useMemo(() => getGameSmartOneLiner(game, allGames), [game, allGames]);
  const progressPct = useMemo(() => getProgressPercent(game), [game]);

  const sortedLogs = useMemo(() => {
    if (!game.playLogs || game.playLogs.length === 0) return [];
    return [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  }, [game.playLogs]);

  const visibleLogs = showAllSessions ? sortedLogs : sortedLogs.slice(0, 5);

  // Similar games in library (same genre)
  const similarGames = useMemo(() => {
    if (!game.genre) return [];
    return allGames
      .filter(g => g.id !== game.id && g.genre === game.genre && g.status !== 'Wishlist')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }, [game, allGames]);

  // Franchise games
  const franchiseGames = useMemo(() => {
    if (!game.franchise) return [];
    return allGames
      .filter(g => g.franchise === game.franchise)
      .sort((a, b) => {
        const aDate = a.datePurchased || a.createdAt;
        const bDate = b.datePurchased || b.createdAt;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
  }, [game, allGames]);

  // "What If" projection
  const whatIfHours = 5;
  const projectedCostPerHour = totalHours > 0 && game.price > 0
    ? calculateCostPerHour(game.price, totalHours + whatIfHours)
    : null;

  // Value chart data - simple inline bar chart
  const maxCPH = valueOverTime.length > 0 ? Math.max(...valueOverTime.map(p => p.costPerHour)) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#0e0e16] h-full overflow-y-auto border-l border-white/5 animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Banner */}
        <div className="relative">
          {game.thumbnail ? (
            <div className="relative h-48 overflow-hidden">
              <img
                src={game.thumbnail}
                alt={game.name}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e16] via-[#0e0e16]/60 to-transparent" />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-r from-purple-900/30 to-blue-900/30" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-all backdrop-blur-sm"
          >
            <X size={20} />
          </button>

          {/* Game info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium', getStatusColor(game.status))}>
                {game.status}
              </span>
              {game.isSpecial && (
                <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium flex items-center gap-1">
                  <Heart size={10} className="fill-amber-400" /> Special
                </span>
              )}
              {game.acquiredFree && (
                <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">FREE</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{game.name}</h1>
            <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
              {game.platform && <span>{game.platform}</span>}
              {game.platform && game.genre && <span>·</span>}
              {game.genre && <span>{game.genre}</span>}
              {game.franchise && (
                <>
                  <span>·</span>
                  <span className="text-purple-400">{game.franchise}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar (if in progress) */}
        {progressPct > 0 && progressPct < 100 && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1">
              <span>Estimated Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Key Stats Bar */}
        <div className="grid grid-cols-5 gap-2 p-5">
          <div className="text-center p-2.5 bg-white/[0.03] rounded-lg">
            {game.originalPrice && game.originalPrice > game.price ? (
              <>
                <div className="text-white/30 line-through text-[10px]">${game.originalPrice}</div>
                <div className="text-emerald-400 font-bold text-sm">${game.price}</div>
              </>
            ) : (
              <div className="text-white/80 font-bold text-sm">${game.price}</div>
            )}
            <div className="text-[10px] text-white/30 mt-0.5">price</div>
          </div>
          <div className="text-center p-2.5 bg-white/[0.03] rounded-lg">
            <div className="text-white/80 font-bold text-sm">{totalHours}h</div>
            <div className="text-[10px] text-white/30 mt-0.5">played</div>
          </div>
          <div className="text-center p-2.5 bg-white/[0.03] rounded-lg">
            <div className="text-white/80 font-bold text-sm">{game.rating}/10</div>
            <div className="text-[10px] text-white/30 mt-0.5">rating</div>
          </div>
          <div className="text-center p-2.5 bg-white/[0.03] rounded-lg">
            {totalHours > 0 && game.price > 0 ? (
              <div className={clsx('font-bold text-sm', getValueColor(game.metrics.valueRating))}>
                ${game.metrics.costPerHour.toFixed(2)}
              </div>
            ) : (
              <div className="text-white/30 font-bold text-sm">-</div>
            )}
            <div className="text-[10px] text-white/30 mt-0.5">per hr</div>
          </div>
          <div className="text-center p-2.5 bg-white/[0.03] rounded-lg">
            {totalHours > 0 && game.price > 0 ? (
              <div className={clsx('font-bold text-sm', getValueColor(getROIRating(game.metrics.roi)))}>
                {game.metrics.roi.toFixed(1)}
              </div>
            ) : (
              <div className="text-white/30 font-bold text-sm">-</div>
            )}
            <div className="text-[10px] text-white/30 mt-0.5">ROI</div>
          </div>
        </div>

        {/* Smart one-liner */}
        {smartLine && (
          <div className="px-5 pb-4">
            <p className="text-xs text-white/35 italic">{smartLine}</p>
          </div>
        )}

        {/* Completion Probability */}
        {(game.status === 'In Progress' || game.status === 'Not Started') && (
          <div className="mx-5 mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/70">Completion Probability</span>
              <span className={clsx(
                'text-lg font-bold',
                completionProb.probability >= 70 && 'text-emerald-400',
                completionProb.probability >= 40 && completionProb.probability < 70 && 'text-yellow-400',
                completionProb.probability < 40 && 'text-red-400',
              )}>
                {completionProb.probability}%
              </span>
            </div>
            <div className="space-y-1.5">
              {completionProb.factors.slice(0, 4).map((factor, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{factor.label}</span>
                  <span className={clsx(
                    'font-medium',
                    factor.impact > 0 ? 'text-emerald-400' : factor.impact < 0 ? 'text-red-400' : 'text-white/30',
                  )}>
                    {factor.impact > 0 ? '+' : ''}{factor.impact}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/25 mt-2 italic">{completionProb.verdict}</p>
          </div>
        )}

        {/* Value Trajectory Chart */}
        {valueOverTime.length > 1 && (
          <div className="mx-5 mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/70">Value Over Time</span>
              <span className="text-xs" style={{ color: valTraj.color }}>
                {valTraj.icon} {valTraj.label}
              </span>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-16 mb-2">
              {valueOverTime.map((point, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${maxCPH > 0 ? Math.max(10, (point.costPerHour / maxCPH) * 100) : 20}%`,
                    backgroundColor: point.costPerHour <= 1 ? '#10b981'
                      : point.costPerHour <= 3 ? '#3b82f6'
                      : point.costPerHour <= 5 ? '#f59e0b'
                      : '#ef4444',
                    opacity: 0.6 + (i / valueOverTime.length) * 0.4,
                  }}
                  title={`${point.cumulativeHours}h → $${point.costPerHour}/hr`}
                />
              ))}
            </div>
            {/* Reference lines legend */}
            <div className="flex items-center gap-3 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> ≤$1</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> ≤$3</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500" /> ≤$5</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> &gt;$5</span>
            </div>
          </div>
        )}

        {/* "What If" Projection */}
        {projectedCostPerHour !== null && game.price > 0 && totalHours > 0 && (
          <div className="mx-5 mb-4 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
            <p className="text-xs text-cyan-300/70">
              Play <span className="font-bold text-cyan-300">{whatIfHours} more hours</span> and your $/hr drops to{' '}
              <span className="font-bold text-cyan-300">${projectedCostPerHour.toFixed(2)}</span>
            </p>
          </div>
        )}

        {/* Play History Timeline */}
        {sortedLogs.length > 0 && (
          <div className="mx-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/70">Play History</span>
              <span className="text-xs text-white/30">{sortedLogs.length} sessions · {totalHours}h total</span>
            </div>
            <div className="space-y-2">
              {visibleLogs.map((log, i) => (
                <div key={log.id || i} className="flex items-start gap-3 p-2.5 bg-white/[0.02] rounded-lg">
                  <Calendar size={14} className="text-white/20 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">{getRelativeTime(log.date)}</span>
                      <span className="text-xs font-medium text-blue-400">{log.hours}h</span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-white/30 mt-0.5 italic">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {sortedLogs.length > 5 && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-white/30 hover:text-white/50 py-2 transition-colors"
              >
                {showAllSessions ? (
                  <><ChevronUp size={14} /> Show less</>
                ) : (
                  <><ChevronDown size={14} /> Show all {sortedLogs.length} sessions</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Session Sparkline (expanded) */}
        {sortedLogs.length >= 3 && (
          <div className="mx-5 mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <span className="text-sm font-medium text-white/70 block mb-3">Session Pattern</span>
            <div className="flex items-end gap-1 h-12">
              {[...sortedLogs].reverse().map((log, i) => {
                const maxH = Math.max(...sortedLogs.map(l => l.hours));
                return (
                  <div
                    key={log.id || i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${maxH > 0 ? Math.max(10, (log.hours / maxH) * 100) : 20}%`,
                      backgroundColor: i === sortedLogs.length - 1 ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    }}
                    title={`${log.date}: ${log.hours}h`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Franchise Context */}
        {franchise && franchiseGames.length >= 2 && (
          <div className="mx-5 mb-4 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-purple-300/80">{franchise.franchiseName} Franchise</span>
              <span className="text-xs text-white/30">{franchise.gamesInFranchise} games · {franchise.totalFranchiseHours.toFixed(0)}h · ${franchise.totalFranchiseSpent.toFixed(0)}</span>
            </div>
            <div className="space-y-1.5">
              {franchiseGames.map((fg, i) => {
                const isCurrentGame = fg.id === game.id;
                const fgHours = getTotalHours(fg);
                return (
                  <div key={fg.id} className={clsx('flex items-center justify-between text-xs p-1.5 rounded', isCurrentGame && 'bg-purple-500/10')}>
                    <div className="flex items-center gap-2">
                      <span className="text-white/20 font-mono text-[10px]">#{i + 1}</span>
                      <span className={isCurrentGame ? 'text-purple-300 font-medium' : 'text-white/50'}>{fg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/30">
                      <span>{fgHours}h</span>
                      <span>{fg.rating}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review */}
        {game.review && (
          <div className="mx-5 mb-4">
            <span className="text-sm font-medium text-white/70 block mb-2">Your Review</span>
            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">{game.review}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {game.notes && (
          <div className="mx-5 mb-4">
            <span className="text-sm font-medium text-white/70 block mb-2">Notes</span>
            <p className="text-xs text-white/40">{game.notes}</p>
          </div>
        )}

        {/* Dates */}
        <div className="mx-5 mb-4">
          <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap">
            {game.datePurchased && <span>Purchased: {game.datePurchased}</span>}
            {game.startDate && <span>Started: {game.startDate}</span>}
            {game.endDate && <span>Finished: {game.endDate}</span>}
          </div>
        </div>

        {/* Similar Games */}
        {similarGames.length > 0 && (
          <div className="mx-5 mb-4">
            <span className="text-sm font-medium text-white/70 block mb-2">Similar in Library ({game.genre})</span>
            <div className="grid grid-cols-2 gap-2">
              {similarGames.map(sg => (
                <div key={sg.id} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-lg">
                  {sg.thumbnail ? (
                    <img src={sg.thumbnail} alt={sg.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center">
                      <Gamepad2 size={14} className="text-white/20" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 truncate">{sg.name}</p>
                    <p className="text-[10px] text-white/30">{sg.rating}/10 · {getTotalHours(sg)}h</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding for sticky bar */}
        <div className="h-20" />

        {/* Sticky Quick Actions Bar */}
        <div className="fixed bottom-0 right-0 w-full max-w-xl bg-[#0e0e16]/95 backdrop-blur-md border-t border-white/5 p-3 flex items-center gap-2">
          <button
            onClick={onLogTime}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium transition-all"
          >
            <Clock size={14} /> Log Time
          </button>
          <button
            onClick={onToggleQueue}
            className={clsx(
              'px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              isInQueue
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            )}
          >
            {isInQueue ? <Check size={14} /> : <ListPlus size={14} />}
            {isInQueue ? 'Queued' : 'Queue'}
          </button>
          <button
            onClick={onToggleSpecial}
            className={clsx(
              'p-2.5 rounded-lg transition-all',
              game.isSpecial
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            )}
            title={game.isSpecial ? 'Remove special' : 'Mark special'}
          >
            <Heart size={14} className={game.isSpecial ? 'fill-amber-400' : ''} />
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <Edit3 size={14} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
