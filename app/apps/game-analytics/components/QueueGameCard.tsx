'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, CheckCircle2, PlayCircle, Calendar, XCircle, Clock, TrendingDown, Zap } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getShelfLife, getOneHourProjection, getEstimatedHoursToReach } from '../lib/calculations';
import { Game } from '../lib/types';
import clsx from 'clsx';

interface QueueGameCardProps {
  game: GameWithMetrics;
  position: number;
  isHero?: boolean; // Position 1 with In Progress = hero card
  estimatedHoursAway?: number;
  onRemove: () => void;
  onLogTime?: () => void;
}

export function QueueGameCard({ game, position, isHero, estimatedHoursAway, onRemove, onLogTime }: QueueGameCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const shelfLife = getShelfLife(game);
  const oneHourProjection = isHero ? getOneHourProjection(game) : null;

  // Calculate days playing
  const getDaysPlaying = () => {
    if (game.status === 'In Progress' && game.startDate) {
      const days = Math.floor(
        (new Date().getTime() - new Date(game.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return days;
    }
    if (game.status === 'Completed' && game.startDate && game.endDate) {
      const days = Math.floor(
        (new Date(game.endDate).getTime() - new Date(game.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return days;
    }
    return null;
  };

  const daysPlaying = getDaysPlaying();

  // Days since last session
  const getDaysSinceLastPlay = () => {
    if (game.playLogs && game.playLogs.length > 0) {
      const sorted = [...game.playLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return Math.floor((Date.now() - new Date(sorted[0].date).getTime()) / (24 * 60 * 60 * 1000));
    }
    return null;
  };

  const daysSinceLastPlay = getDaysSinceLastPlay();

  // Last session note
  const getLastSessionInfo = () => {
    if (game.playLogs && game.playLogs.length > 0) {
      const sorted = [...game.playLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        note: sorted[0].notes || null,
        hours: sorted[0].hours,
        date: sorted[0].date,
      };
    }
    return null;
  };

  const lastSession = getLastSessionInfo();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = () => {
    switch (game.status) {
      case 'Completed': return <CheckCircle2 size={isHero ? 16 : 14} className="text-emerald-400" />;
      case 'In Progress': return <PlayCircle size={isHero ? 16 : 14} className="text-blue-400" />;
      case 'Abandoned': return <XCircle size={isHero ? 16 : 14} className="text-red-400" />;
      default: return <Calendar size={isHero ? 16 : 14} className="text-white/30" />;
    }
  };

  const getStatusLabel = () => {
    switch (game.status) {
      case 'Completed': return 'Completed';
      case 'In Progress': return 'Playing';
      case 'Abandoned': return 'Abandoned';
      default: return 'Upcoming';
    }
  };

  const getStatusColor = () => {
    switch (game.status) {
      case 'Completed': return 'text-emerald-400';
      case 'In Progress': return 'text-blue-400';
      case 'Abandoned': return 'text-red-400';
      default: return 'text-white/30';
    }
  };

  // ===== HERO CARD (Position 1, In Progress) =====
  if (isHero) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'group relative rounded-2xl transition-all now-playing-glow',
          'bg-gradient-to-br from-blue-500/10 via-white/[0.03] to-purple-500/10',
          'border border-blue-500/20',
          isDragging && 'opacity-50 ring-2 ring-blue-500/50'
        )}
      >
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-t-2xl">
          {game.thumbnail && (
            <div className="relative h-32 sm:h-40">
              <img
                src={game.thumbnail}
                alt={game.name}
                className="w-full h-full object-cover opacity-40"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
            </div>
          )}

          {/* Drag Handle + Position - overlaid on banner */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="touch-manipulation cursor-grab active:cursor-grabbing p-1.5 text-white/40 hover:text-white/70 transition-colors bg-black/30 rounded-lg backdrop-blur-sm"
              aria-label="Drag to reorder"
            >
              <GripVertical size={18} />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/30 backdrop-blur-sm rounded-full">
              <PlayCircle size={14} className="text-blue-300" />
              <span className="text-xs font-bold text-blue-200">NOW PLAYING</span>
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-3 right-3 touch-manipulation p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all bg-black/30 backdrop-blur-sm"
            aria-label="Remove from queue"
          >
            <X size={16} />
          </button>

          {/* Game Name + Status overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {game.platform && (
                <span className="text-[10px] px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-white/60">{game.platform}</span>
              )}
              {game.genre && (
                <span className="text-[10px] px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-white/60">{game.genre}</span>
              )}
            </div>
          </div>
        </div>

        {/* Hero Stats Row */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-white/[0.03] rounded-lg">
              <div className="text-blue-400 font-bold text-sm">{game.totalHours}h</div>
              <div className="text-[10px] text-white/30">played</div>
            </div>
            <div className="p-2 bg-white/[0.03] rounded-lg">
              <div className="text-white/80 font-bold text-sm">{daysPlaying !== null ? `${daysPlaying}d` : '-'}</div>
              <div className="text-[10px] text-white/30">playing for</div>
            </div>
            <div className="p-2 bg-white/[0.03] rounded-lg">
              <div className="text-white/80 font-bold text-sm">{game.playLogs?.length || 0}</div>
              <div className="text-[10px] text-white/30">sessions</div>
            </div>
            <div className="p-2 bg-white/[0.03] rounded-lg">
              <div className={clsx('font-bold text-sm', daysSinceLastPlay !== null && daysSinceLastPlay <= 2 ? 'text-emerald-400' : daysSinceLastPlay !== null && daysSinceLastPlay <= 7 ? 'text-yellow-400' : 'text-red-400')}>
                {daysSinceLastPlay !== null ? (daysSinceLastPlay === 0 ? 'Today' : daysSinceLastPlay === 1 ? '1d' : `${daysSinceLastPlay}d`) : '-'}
              </div>
              <div className="text-[10px] text-white/30">last played</div>
            </div>
          </div>

          {/* Last session note */}
          {lastSession?.note && (
            <div className="mt-2 px-3 py-2 bg-white/[0.02] rounded-lg border-l-2 border-blue-500/30">
              <p className="text-xs text-white/50 italic">&ldquo;{lastSession.note}&rdquo;</p>
            </div>
          )}

          {/* 1 Hour Projection */}
          {oneHourProjection && oneHourProjection.currentHours > 0 && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <Zap size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400/80">
                <span className="font-medium">1 hour today</span> drops cost to ${oneHourProjection.newCostPerHour.toFixed(2)}/hr
                {oneHourProjection.costImprovement > 0.1 && (
                  <span className="text-emerald-400/60"> (-${oneHourProjection.costImprovement.toFixed(2)})</span>
                )}
              </p>
            </div>
          )}

          {/* Log Time button */}
          {onLogTime && (
            <button
              onClick={(e) => { e.stopPropagation(); onLogTime(); }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-medium transition-all"
            >
              <Clock size={16} />
              Log Play Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== STANDARD CARD =====
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group flex items-center gap-3 p-3 rounded-xl transition-all',
        'bg-white/[0.02] border border-white/5',
        game.status === 'Completed' && 'opacity-60',
        isDragging && 'opacity-50 ring-2 ring-purple-500/50'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-manipulation cursor-grab active:cursor-grabbing p-2 -m-2 text-white/30 hover:text-white/60 transition-colors shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={20} />
      </button>

      {/* Position Badge */}
      <div className={clsx(
        'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
        game.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400 node-pulse' :
        game.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
        'bg-purple-500/15 text-purple-400/70'
      )}>
        {position}
      </div>

      {/* Thumbnail */}
      {game.thumbnail && (
        <div className="shrink-0">
          <img
            src={game.thumbnail}
            alt={game.name}
            className="w-14 h-14 object-cover rounded-lg"
            loading="lazy"
          />
        </div>
      )}

      {/* Game Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-medium text-white/90 truncate">
            {game.name}
          </h3>
          {/* Shelf life badge */}
          {shelfLife.level !== 'fresh' && game.status !== 'Completed' && (
            <span
              className="dust-float text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{ backgroundColor: `${shelfLife.color}15`, color: shelfLife.color }}
              title={`${shelfLife.daysInQueue} days`}
            >
              {shelfLife.label}
            </span>
          )}
        </div>

        {/* Status + Days Playing */}
        <div className="flex items-center gap-1.5">
          {getStatusIcon()}
          <span className={clsx('text-xs font-medium', getStatusColor())}>{getStatusLabel()}</span>

          {daysPlaying !== null && game.status === 'In Progress' && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs text-white/40">Day {daysPlaying}</span>
            </>
          )}
          {daysPlaying !== null && game.status === 'Completed' && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs text-white/40">{daysPlaying}d to beat</span>
            </>
          )}
        </div>

        {/* Stats line */}
        <div className="flex items-center gap-2 mt-0.5">
          {game.totalHours > 0 && (
            <span className="text-xs text-white/40">{game.totalHours}h</span>
          )}
          {game.totalHours > 0 && game.price > 0 && (
            <>
              <span className="text-white/10">·</span>
              <span className={clsx('text-xs',
                game.metrics.valueRating === 'Excellent' ? 'text-emerald-400/60' :
                game.metrics.valueRating === 'Good' ? 'text-blue-400/60' :
                game.metrics.valueRating === 'Fair' ? 'text-yellow-400/60' : 'text-red-400/60'
              )}>
                ${game.metrics.costPerHour.toFixed(2)}/hr
              </span>
            </>
          )}
          {daysSinceLastPlay !== null && game.status === 'In Progress' && (
            <>
              <span className="text-white/10">·</span>
              <span className={clsx('text-xs', daysSinceLastPlay <= 3 ? 'text-white/40' : 'text-yellow-400/60')}>
                {daysSinceLastPlay === 0 ? 'played today' : daysSinceLastPlay === 1 ? 'played yesterday' : `${daysSinceLastPlay}d ago`}
              </span>
            </>
          )}
          {game.status === 'Not Started' && game.datePurchased && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs text-white/30">
                bought {formatDate(game.datePurchased)}
              </span>
            </>
          )}
          {estimatedHoursAway !== undefined && estimatedHoursAway > 0 && game.status === 'Not Started' && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs text-white/25">~{estimatedHoursAway}h away</span>
            </>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="touch-manipulation p-2 -m-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Remove from queue"
      >
        <X size={18} />
      </button>
    </div>
  );
}
