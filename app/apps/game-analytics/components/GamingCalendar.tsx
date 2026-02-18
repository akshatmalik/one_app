'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, CheckCircle, Play } from 'lucide-react';
import { Game } from '../lib/types';
import { getCalendarData, CalendarDay } from '../lib/calculations';
import clsx from 'clsx';

interface GamingCalendarProps {
  games: Game[];
  className?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INTENSITY_COLORS = [
  'bg-white/[0.02]',         // 0 - no activity
  'bg-purple-500/15',        // 1 - light
  'bg-purple-500/30',        // 2 - medium
  'bg-purple-500/50',        // 3 - heavy
  'bg-purple-500/70',        // 4 - intense
];

function DayCell({ day, isToday, onClick }: { day: CalendarDay | null; isToday: boolean; onClick?: () => void }) {
  if (!day) {
    return <div className="aspect-square rounded bg-transparent" />;
  }

  const hasEvents = day.events.length > 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'aspect-square rounded-lg relative transition-all text-left p-1 group',
        INTENSITY_COLORS[day.intensity],
        isToday && 'ring-1 ring-purple-400/50',
        day.hours > 0 && 'hover:ring-1 hover:ring-white/20',
      )}
      title={day.hours > 0 ? `${day.hours}h · ${day.sessions} session${day.sessions > 1 ? 's' : ''}` : undefined}
    >
      <div className={clsx(
        'text-[10px] leading-none',
        day.hours > 0 ? 'text-white/60' : 'text-white/20',
        isToday && 'text-purple-400 font-bold',
      )}>
        {day.dayOfMonth}
      </div>

      {/* Hours label for active days */}
      {day.hours > 0 && (
        <div className="text-[8px] text-white/40 mt-0.5 font-mono">
          {day.hours}h
        </div>
      )}

      {/* Event dots */}
      {hasEvents && (
        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
          {day.events.some(e => e.type === 'purchase') && (
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
          )}
          {day.events.some(e => e.type === 'completion') && (
            <div className="w-1 h-1 rounded-full bg-yellow-400" />
          )}
          {day.events.some(e => e.type === 'start') && (
            <div className="w-1 h-1 rounded-full bg-blue-400" />
          )}
        </div>
      )}
    </button>
  );
}

function DayDetail({ day }: { day: CalendarDay }) {
  return (
    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70 font-medium">{day.date}</span>
        <span className="text-xs text-white/40">{day.hours}h · {day.sessions} session{day.sessions > 1 ? 's' : ''}</span>
      </div>

      {/* Games played */}
      {day.games.length > 0 && (
        <div className="space-y-1.5">
          {day.games.map(game => (
            <div key={game.name} className="flex items-center gap-2">
              {game.thumbnail ? (
                <img src={game.thumbnail} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" />
              ) : (
                <div className="w-6 h-6 rounded bg-white/5" />
              )}
              <span className="text-xs text-white/60 flex-1 truncate">{game.name}</span>
              <span className="text-[10px] text-white/30 font-mono">{game.hours}h</span>
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      {day.events.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/5">
          {day.events.map((evt, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              {evt.type === 'purchase' && <ShoppingCart size={10} className="text-emerald-400" />}
              {evt.type === 'completion' && <CheckCircle size={10} className="text-yellow-400" />}
              {evt.type === 'start' && <Play size={10} className="text-blue-400" />}
              <span className="text-white/40">
                {evt.type === 'purchase' && 'Purchased'}
                {evt.type === 'completion' && 'Completed'}
                {evt.type === 'start' && 'Started'}
                {' '}{evt.gameName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GamingCalendar({ games, className }: GamingCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const calendarData = useMemo(
    () => getCalendarData(games, viewYear, viewMonth),
    [games, viewYear, viewMonth]
  );

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const goToPrev = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNext = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
    setSelectedDay(null);
  };

  return (
    <div className={clsx('p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white/50">Gaming Calendar</h3>
          <div className="text-lg font-bold text-white/90">{calendarData.label}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goToPrev} className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-0.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            Today
          </button>
          <button onClick={goToNext} className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month Stats */}
      <div className="flex gap-4 mb-4 text-[11px]">
        <div>
          <span className="text-white/30">Hours</span>
          <span className="text-white/70 font-medium ml-1">{calendarData.totalHours}h</span>
        </div>
        <div>
          <span className="text-white/30">Sessions</span>
          <span className="text-white/70 font-medium ml-1">{calendarData.totalSessions}</span>
        </div>
        <div>
          <span className="text-white/30">Active Days</span>
          <span className="text-white/70 font-medium ml-1">{calendarData.activeDays}</span>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center text-[9px] text-white/20 font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            isToday={day?.date === todayStr}
            onClick={day && day.hours > 0 ? () => setSelectedDay(day === selectedDay ? null : day) : undefined}
          />
        ))}
      </div>

      {/* Intensity Legend */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <span className="text-[9px] text-white/20">Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div key={i} className={clsx('w-3 h-3 rounded-sm', color)} />
        ))}
        <span className="text-[9px] text-white/20">More</span>
      </div>

      {/* Event legend */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[9px] text-white/20">Purchase</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <span className="text-[9px] text-white/20">Completion</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[9px] text-white/20">Started</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="mt-3">
          <DayDetail day={selectedDay} />
        </div>
      )}
    </div>
  );
}
