'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Clock, Star, ChevronDown, ChevronUp, ListPlus, Check, Heart, Edit3, Trash2, Gamepad2 } from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getTotalHours,
  getCompletionProbability,
  getValueOverTime,
  getValueTrajectory,
  getFranchiseInfo,
  getRelativeTime,
  parseLocalDate,
  getProgressPercent,
  calculateCostPerHour,
  getROIRating,
  getRelationshipStatus,
  getCardRarity,
  generateGameBiography,
  getGameVerdicts,
} from '../lib/calculations';
import { RatingStars } from './RatingStars';
import { GameJourney } from './GameJourney';
import { QuickCheckIn } from './QuickCheckIn';
import clsx from 'clsx';

interface GameBottomSheetProps {
  game: GameWithMetrics;
  allGames: Game[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogTime: (hours?: number) => void;
  onOpenPlayLog: () => void;
  onToggleQueue: () => void;
  onToggleSpecial: () => void;
  isInQueue: boolean;
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

export function GameBottomSheet({
  game,
  allGames,
  onClose,
  onEdit,
  onDelete,
  onLogTime,
  onOpenPlayLog,
  onToggleQueue,
  onToggleSpecial,
  isInQueue,
}: GameBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);

  const totalHours = game.totalHours;
  const relationship = useMemo(() => getRelationshipStatus(game, allGames), [game, allGames]);
  const rarity = useMemo(() => getCardRarity(game), [game]);
  const biography = useMemo(() => generateGameBiography(game, allGames), [game, allGames]);
  const verdicts = useMemo(() => getGameVerdicts(game, allGames), [game, allGames]);
  const completionProb = useMemo(() => getCompletionProbability(game, allGames), [game, allGames]);
  const valTraj = useMemo(() => getValueTrajectory(game), [game]);
  const franchise = useMemo(() => getFranchiseInfo(game, allGames), [game, allGames]);
  const progressPct = useMemo(() => getProgressPercent(game), [game]);

  const sortedLogs = useMemo(() => {
    if (!game.playLogs || game.playLogs.length === 0) return [];
    return [...game.playLogs].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  }, [game.playLogs]);

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

  // Touch drag to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) { // Only allow dragging down
      currentTranslateY.current = delta;
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!sheetRef.current) return;
    if (currentTranslateY.current > 150) {
      onClose();
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      }, 300);
    }
    dragStartY.current = null;
    currentTranslateY.current = 0;
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-[#0e0e16] rounded-t-2xl max-h-[90dvh] overflow-hidden animate-bottom-sheet-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 min-h-0 pb-24 overscroll-contain">
          {/* Hero */}
          <div className="relative">
            {game.thumbnail ? (
              <div className="relative h-44 overflow-hidden">
                <img
                  src={game.thumbnail}
                  alt={game.name}
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e16] via-[#0e0e16]/50 to-transparent" />
              </div>
            ) : (
              <div className="h-28 bg-gradient-to-r from-purple-900/20 to-blue-900/20" />
            )}

            {/* Game info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ color: relationship.color, backgroundColor: relationship.bgColor }}
                >
                  {relationship.label}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: rarity.tier === 'legendary' ? '#fbbf24'
                      : rarity.tier === 'epic' ? '#a855f7'
                      : rarity.tier === 'rare' ? '#3b82f6'
                      : rarity.tier === 'uncommon' ? '#22c55e'
                      : '#6b7280',
                    backgroundColor: rarity.tier === 'legendary' ? 'rgba(251,191,36,0.15)'
                      : rarity.tier === 'epic' ? 'rgba(168,85,247,0.15)'
                      : rarity.tier === 'rare' ? 'rgba(59,130,246,0.15)'
                      : rarity.tier === 'uncommon' ? 'rgba(34,197,94,0.15)'
                      : 'rgba(107,114,128,0.15)',
                  }}
                >
                  {rarity.label}
                </span>
                {game.isSpecial && (
                  <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium flex items-center gap-1">
                    <Heart size={10} className="fill-amber-400" /> Special
                  </span>
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

          {/* Progress bar */}
          {progressPct > 0 && progressPct < 100 && (
            <div className="px-5 pt-3">
              <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Key Stats */}
          <div className="grid grid-cols-4 gap-2 p-5">
            <div className="text-center p-2 bg-white/[0.03] rounded-lg">
              {game.acquiredFree ? (
                <div className="text-emerald-400 font-bold text-sm">Free</div>
              ) : (
                <div className="text-white/80 font-bold text-sm">${game.price}</div>
              )}
              <div className="text-[10px] text-white/30 mt-0.5">price</div>
            </div>
            <div className="text-center p-2 bg-white/[0.03] rounded-lg">
              <div className="text-white/80 font-bold text-sm">{totalHours}h</div>
              <div className="text-[10px] text-white/30 mt-0.5">played</div>
            </div>
            <div className="text-center p-2 bg-white/[0.03] rounded-lg">
              <div className="flex justify-center mb-0.5">
                <RatingStars rating={game.rating} size={11} />
              </div>
              <div className="text-[10px] text-white/30">{game.rating}/10</div>
            </div>
            <div className="text-center p-2 bg-white/[0.03] rounded-lg">
              {totalHours > 0 && game.price > 0 ? (
                <div className={clsx('font-bold text-sm', getValueColor(game.metrics.valueRating))}>
                  ${game.metrics.costPerHour.toFixed(2)}
                </div>
              ) : (
                <div className="text-white/30 font-bold text-sm">-</div>
              )}
              <div className="text-[10px] text-white/30 mt-0.5">per hr</div>
            </div>
          </div>

          {/* Biography */}
          {biography && (
            <div className="px-5 pb-4">
              <p className="text-sm text-white/45 leading-relaxed italic">{biography}</p>
            </div>
          )}

          {/* Quick Check-In */}
          {game.status !== 'Completed' && game.status !== 'Wishlist' && game.status !== 'Abandoned' && (
            <div className="px-5 pb-4">
              <QuickCheckIn
                game={game}
                onLogTime={(hours) => onLogTime(hours)}
                onOpenFullLog={onOpenPlayLog}
              />
            </div>
          )}

          {/* Your Verdicts */}
          {verdicts.length > 0 && (
            <div className="px-5 pb-4">
              <span className="text-sm font-medium text-white/70 block mb-3">Your Verdict</span>
              <div className="grid grid-cols-2 gap-2">
                {verdicts.map((v) => (
                  <div key={v.category} className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <div className="text-[10px] text-white/30 mb-1">{v.category}</div>
                    <div className="text-sm font-bold" style={{ color: v.color }}>{v.verdict}</div>
                    <div className="text-[10px] text-white/25 mt-0.5">{v.justification}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Probability */}
          {(game.status === 'In Progress' || game.status === 'Not Started') && (
            <div className="mx-5 mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/70">Completion Odds</span>
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
                {completionProb.factors.slice(0, 3).map((factor, i) => (
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
            </div>
          )}

          {/* Journey */}
          {(game.playLogs && game.playLogs.length > 0) && (
            <div className="px-5 pb-4">
              <span className="text-sm font-medium text-white/70 block mb-3">The Journey</span>
              <GameJourney game={game} />
            </div>
          )}

          {/* Franchise Context */}
          {franchise && franchiseGames.length >= 2 && (
            <div className="mx-5 mb-4 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-purple-300/80">{franchise.franchiseName}</span>
                <span className="text-xs text-white/30">{franchise.gamesInFranchise} games</span>
              </div>
              <div className="space-y-1.5">
                {franchiseGames.map((fg, i) => {
                  const isCurrentGame = fg.id === game.id;
                  return (
                    <div key={fg.id} className={clsx('flex items-center justify-between text-xs p-1.5 rounded', isCurrentGame && 'bg-purple-500/10')}>
                      <div className="flex items-center gap-2">
                        <span className="text-white/20 font-mono text-[10px]">#{i + 1}</span>
                        <span className={isCurrentGame ? 'text-purple-300 font-medium' : 'text-white/50'}>{fg.name}</span>
                      </div>
                      <span className="text-white/30">{fg.rating}/10</span>
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
        </div>

        {/* Sticky Actions Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#0e0e16]/95 backdrop-blur-md border-t border-white/5 p-3 flex items-center gap-2">
          <button
            onClick={() => onLogTime()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600/20 active:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium transition-all"
          >
            <Clock size={14} /> Log Time
          </button>
          <button
            onClick={onToggleQueue}
            className={clsx(
              'px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              isInQueue
                ? 'bg-purple-500/20 text-purple-400 active:bg-purple-500/30'
                : 'bg-white/5 text-white/50 active:bg-white/10'
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
                ? 'bg-amber-500/20 text-amber-400 active:bg-amber-500/30'
                : 'bg-white/5 text-white/50 active:bg-white/10'
            )}
          >
            <Heart size={14} className={game.isSpecial ? 'fill-amber-400' : ''} />
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2.5 bg-white/5 active:bg-white/10 text-white/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <Edit3 size={14} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 bg-white/5 active:bg-red-500/10 text-white/30 active:text-red-400 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
