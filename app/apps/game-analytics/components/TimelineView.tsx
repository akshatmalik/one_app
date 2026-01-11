'use client';

import { useMemo, useState } from 'react';
import { Calendar, Clock, Gamepad2, DollarSign, Play, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { getAllPlayLogs, getLastCompletedWeekStats } from '../lib/calculations';
import { TimelinePeriodCards } from './TimelinePeriodCards';
import { QuickAddTimeModal } from './QuickAddTimeModal';
import { WeekInReview } from './WeekInReview';
import clsx from 'clsx';

interface TimelineViewProps {
  games: Game[];
  onLogTime?: (game: Game) => void;
  onQuickAddTime?: (gameId: string, playLog: PlayLog) => Promise<void>;
}

type TimelineEvent = {
  id: string;
  date: string;
  type: 'play' | 'purchase' | 'start' | 'complete' | 'abandon';
  game: Game;
  hours?: number;
  notes?: string;
  price?: number;
};

export function TimelineView({ games, onLogTime, onQuickAddTime }: TimelineViewProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Get week in review data
  const weekInReviewData = useMemo(() => {
    return getLastCompletedWeekStats(games);
  }, [games]);

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    games.forEach(game => {
      // Add purchase events
      if (game.datePurchased && game.status !== 'Wishlist') {
        allEvents.push({
          id: `purchase-${game.id}`,
          date: game.datePurchased,
          type: 'purchase',
          game,
          price: game.price,
        });
      }

      // Add start events
      if (game.startDate) {
        allEvents.push({
          id: `start-${game.id}`,
          date: game.startDate,
          type: 'start',
          game,
        });
      }

      // Add complete/abandon events
      if (game.endDate) {
        allEvents.push({
          id: `end-${game.id}`,
          date: game.endDate,
          type: game.status === 'Abandoned' ? 'abandon' : 'complete',
          game,
        });
      }

      // Add play log events
      if (game.playLogs) {
        game.playLogs.forEach(log => {
          allEvents.push({
            id: `play-${log.id}`,
            date: log.date,
            type: 'play',
            game,
            hours: log.hours,
            notes: log.notes,
          });
        });
      }
    });

    // Sort by date descending
    return allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games]);

  // Group events by month
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach(event => {
      const monthKey = event.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });
    return groups;
  }, [events]);

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Parse date string (YYYY-MM-DD) as local date to avoid timezone shift
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'play': return <Play size={14} className="text-blue-400" />;
      case 'purchase': return <DollarSign size={14} className="text-emerald-400" />;
      case 'start': return <Gamepad2 size={14} className="text-purple-400" />;
      case 'complete': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'abandon': return <XCircle size={14} className="text-red-400" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'play': return 'bg-blue-500/20 border-blue-500/30';
      case 'purchase': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'start': return 'bg-purple-500/20 border-purple-500/30';
      case 'complete': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'abandon': return 'bg-red-500/20 border-red-500/30';
    }
  };

  const getEventLabel = (event: TimelineEvent) => {
    switch (event.type) {
      case 'play': return `Played for ${event.hours}h`;
      case 'purchase': return `Purchased for $${event.price}`;
      case 'start': return 'Started playing';
      case 'complete': return 'Completed';
      case 'abandon': return 'Abandoned';
    }
  };

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, { hours: number; sessions: number; games: Set<string> }> = {};
    events.forEach(event => {
      if (event.type === 'play') {
        const monthKey = event.date.substring(0, 7);
        if (!totals[monthKey]) {
          totals[monthKey] = { hours: 0, sessions: 0, games: new Set() };
        }
        totals[monthKey].hours += event.hours || 0;
        totals[monthKey].sessions += 1;
        totals[monthKey].games.add(event.game.id);
      }
    });
    return totals;
  }, [events]);

  const handleQuickAddTime = async (gameId: string, playLog: PlayLog) => {
    if (onQuickAddTime) {
      await onQuickAddTime(gameId, playLog);
    }
  };

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        {/* Week in Review */}
        {weekInReviewData.totalHours > 0 && (
          <WeekInReview data={weekInReviewData} />
        )}

        {/* Period Cards */}
        <TimelinePeriodCards games={games} />

        {/* Quick Add Button */}
        {onQuickAddTime && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-sm font-medium"
            >
              <Plus size={16} />
              Add Play Time
            </button>
          </div>
        )}

        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">No timeline events yet</p>
          <p className="text-white/20 text-xs mt-1">Add games with dates or log play sessions to see your timeline</p>
        </div>

        {/* Quick Add Modal */}
        {showQuickAdd && onQuickAddTime && (
          <QuickAddTimeModal
            games={games}
            onSave={handleQuickAddTime}
            onClose={() => setShowQuickAdd(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week in Review */}
      {weekInReviewData.totalHours > 0 && (
        <WeekInReview data={weekInReviewData} />
      )}

      {/* Period Cards */}
      <TimelinePeriodCards games={games} />

      {/* Quick Add Button */}
      {onQuickAddTime && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Add Play Time
          </button>
        </div>
      )}

      {/* Timeline Events */}
      <div className="space-y-8">
      {Object.entries(groupedEvents).map(([monthKey, monthEvents]) => (
        <div key={monthKey}>
          {/* Month Header */}
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-white">{formatMonth(monthKey)}</h3>
            <div className="flex-1 h-px bg-white/5" />
            {monthlyTotals[monthKey] && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-purple-400 font-medium">{monthlyTotals[monthKey].hours.toFixed(1)}h</span>
                <span className="text-white/20">•</span>
                <span className="text-white/40">{monthlyTotals[monthKey].sessions} sessions</span>
                <span className="text-white/20">•</span>
                <span className="text-white/40">{monthlyTotals[monthKey].games.size} games</span>
              </div>
            )}
            <span className="text-xs text-white/30">{monthEvents.length} events</span>
          </div>

          {/* Events */}
          <div className="space-y-3 relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-3 bottom-3 w-px bg-white/5" />

            {monthEvents.map((event, idx) => (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Thumbnail or Icon */}
                <div className="relative z-10 shrink-0">
                  {event.game.thumbnail ? (
                    <div className="relative">
                      <img
                        src={event.game.thumbnail}
                        alt={event.game.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        loading="lazy"
                      />
                      {/* Event type badge overlay */}
                      <div className={clsx(
                        'absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center border border-[#1a1a24]',
                        getEventColor(event.type)
                      )}>
                        <div className="scale-50">
                          {getEventIcon(event.type)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center border',
                      getEventColor(event.type)
                    )}>
                      {getEventIcon(event.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/90 font-medium">{event.game.name}</span>
                        {event.type === 'play' && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                            {event.hours}h
                          </span>
                        )}
                        {onLogTime && event.game.status !== 'Wishlist' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLogTime(event.game);
                            }}
                            className="text-xs px-2 py-0.5 bg-white/5 hover:bg-purple-500/20 text-white/40 hover:text-purple-400 rounded-full transition-all flex items-center gap-1"
                            title="Log play time"
                          >
                            <Clock size={10} />
                            Log Time
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-white/50 mt-0.5">{getEventLabel(event)}</p>
                      {event.notes && (
                        <p className="text-xs text-white/30 mt-1 italic">&ldquo;{event.notes}&rdquo;</p>
                      )}
                    </div>
                    <div className="text-xs text-white/30 shrink-0">
                      {parseLocalDate(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && onQuickAddTime && (
        <QuickAddTimeModal
          games={games}
          onSave={handleQuickAddTime}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
