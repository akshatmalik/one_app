'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, CheckCircle2, PlayCircle, Calendar, XCircle } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import clsx from 'clsx';

interface QueueGameCardProps {
  game: GameWithMetrics;
  position: number;
  onRemove: () => void;
}

export function QueueGameCard({ game, position, onRemove }: QueueGameCardProps) {
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

  // Calculate days
  const getDaysInfo = () => {
    if (game.status === 'Completed' && game.startDate && game.endDate) {
      const days = Math.floor(
        (new Date(game.endDate).getTime() - new Date(game.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return `${days} days`;
    }

    if (game.status === 'In Progress' && game.startDate) {
      const days = Math.floor(
        (new Date().getTime() - new Date(game.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return `${days} days ongoing`;
    }

    if (game.status === 'Abandoned' && game.startDate) {
      if (game.endDate) {
        const days = Math.floor(
          (new Date(game.endDate).getTime() - new Date(game.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        return `Played ${days} days`;
      }
      const days = Math.floor(
        (new Date().getTime() - new Date(game.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return `Played ${days} days`;
    }

    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = () => {
    switch (game.status) {
      case 'Completed':
        return (
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Completed</span>
          </div>
        );
      case 'In Progress':
        return (
          <div className="flex items-center gap-1">
            <PlayCircle size={12} className="text-blue-400" />
            <span className="text-[10px] text-blue-400 font-medium">In Progress</span>
          </div>
        );
      case 'Abandoned':
        return (
          <div className="flex items-center gap-1">
            <XCircle size={12} className="text-red-400" />
            <span className="text-[10px] text-red-400 font-medium">Abandoned</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <Calendar size={12} className="text-white/30" />
            <span className="text-[10px] text-white/30 font-medium">Upcoming</span>
          </div>
        );
    }
  };

  const getStatsLine = () => {
    const parts = [];

    if (game.status === 'Completed') {
      parts.push(`${game.totalHours}h`);
      if (game.startDate && game.endDate) {
        parts.push(`${formatDate(game.startDate)} → ${formatDate(game.endDate)}`);
      }
      const daysInfo = getDaysInfo();
      if (daysInfo) parts.push(daysInfo);
    } else if (game.status === 'In Progress') {
      parts.push(`${game.totalHours}h`);
      if (game.startDate) {
        parts.push(`Started ${formatDate(game.startDate)}`);
      }
      const daysInfo = getDaysInfo();
      if (daysInfo) parts.push(daysInfo);
    } else if (game.status === 'Abandoned') {
      parts.push(`${game.totalHours}h`);
      if (game.startDate) {
        parts.push(`Started ${formatDate(game.startDate)}`);
      }
      const daysInfo = getDaysInfo();
      if (daysInfo) parts.push(daysInfo);
    } else {
      return 'Upcoming';
    }

    return parts.join(' • ');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group flex items-center gap-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl transition-all',
        isDragging && 'opacity-50 ring-2 ring-purple-500/50'
      )}
    >
      {/* Drag Handle - larger touch target for mobile */}
      <button
        {...attributes}
        {...listeners}
        className="touch-manipulation cursor-grab active:cursor-grabbing p-2 -m-1 text-white/30 hover:text-white/60 transition-colors shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>

      {/* Position Badge - smaller and more compact */}
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold shrink-0">
        {position}
      </div>

      {/* Thumbnail */}
      {game.thumbnail && (
        <div className="shrink-0">
          <img
            src={game.thumbnail}
            alt={game.name}
            className="w-12 h-12 object-cover rounded-lg"
            loading="lazy"
          />
        </div>
      )}

      {/* Game Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-medium text-white/90 truncate mb-0.5">
          {game.name}
        </h3>
        {getStatusBadge()}
        <p className="text-[10px] text-white/40 mt-0.5">
          {getStatsLine()}
        </p>
      </div>

      {/* Remove Button - larger touch target for mobile */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="touch-manipulation p-2 -m-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
        aria-label="Remove from queue"
      >
        <X size={16} />
      </button>
    </div>
  );
}
