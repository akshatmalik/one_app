'use client';

import { useMemo, useState } from 'react';
import { Gamepad2, DollarSign, CheckCircle, Play, XCircle, ChevronDown } from 'lucide-react';
import { Game } from '../lib/types';
import { getActivityFeed, ActivityFeedEvent, parseLocalDate } from '../lib/calculations';
import clsx from 'clsx';

interface ActivityFeedProps {
  games: Game[];
  className?: string;
}

const PAGE_SIZE = 30;

function formatRelativeDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined });
}

function EventIcon({ type }: { type: ActivityFeedEvent['type'] }) {
  switch (type) {
    case 'play': return <Gamepad2 size={14} className="text-purple-400" />;
    case 'purchase': return <DollarSign size={14} className="text-emerald-400" />;
    case 'completion': return <CheckCircle size={14} className="text-emerald-400" />;
    case 'start': return <Play size={14} className="text-blue-400" />;
    case 'abandon': return <XCircle size={14} className="text-red-400" />;
    case 'milestone': return <CheckCircle size={14} className="text-yellow-400" />;
  }
}

function EventCard({ event }: { event: ActivityFeedEvent }) {
  const isCompletion = event.type === 'completion';

  return (
    <div className={clsx(
      'flex items-start gap-3 p-3 rounded-xl transition-colors',
      isCompletion ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-white/[0.02] border border-white/5',
    )}>
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-white/5">
        {event.thumbnail ? (
          <img src={event.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <EventIcon type={event.type} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <EventIcon type={event.type} />
          <span className="text-sm text-white/80">{event.description}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          {event.hours !== undefined && (
            <span>{event.hours.toFixed(1)}h</span>
          )}
          {event.price !== undefined && (
            <span>${event.price.toFixed(2)}</span>
          )}
          {event.rating !== undefined && (
            <span className="text-yellow-400/60">{event.rating}/10</span>
          )}
          {event.detail && (
            <span className="truncate">{event.detail}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ games, className }: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { events, total } = useMemo(() => getActivityFeed(games, visibleCount), [games, visibleCount]);

  // Group events by date
  const grouped = useMemo(() => {
    const groups: { date: string; label: string; events: ActivityFeedEvent[] }[] = [];
    let currentDate = '';

    events.forEach(event => {
      if (event.date !== currentDate) {
        currentDate = event.date;
        groups.push({ date: event.date, label: formatRelativeDate(event.date), events: [] });
      }
      groups[groups.length - 1].events.push(event);
    });

    return groups;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className={clsx('p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center', className)}>
        <p className="text-white/30 text-sm">No activity yet. Start logging play sessions!</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-1', className)}>
      {grouped.map(group => (
        <div key={group.date}>
          {/* Date Header */}
          <div className="sticky top-0 z-10 py-2 backdrop-blur-sm">
            <div className="text-[11px] font-medium text-white/30 uppercase tracking-wider">
              {group.label}
            </div>
          </div>

          {/* Events for this date */}
          <div className="space-y-1.5 mb-3">
            {group.events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {visibleCount < total && (
        <button
          onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-1"
        >
          <ChevronDown size={14} />
          Show more ({total - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
