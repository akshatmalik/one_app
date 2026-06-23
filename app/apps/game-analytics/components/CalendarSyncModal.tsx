'use client';

import { useMemo, useState } from 'react';
import { X, CalendarPlus, Download, ExternalLink, ListOrdered, ShoppingCart, Target, Gamepad2 } from 'lucide-react';
import clsx from 'clsx';
import { Game, GamingGoal, PurchaseQueueEntry } from '../lib/types';
import { buildPlaythroughTimeline } from '../lib/timeline-estimator';
import { loadEstimatorSettings } from '../lib/estimator-settings';
import { CalendarEvent, generateICS, downloadICSFile, buildGoogleCalendarUrl } from '../lib/calendar-export';
import { formatDate } from '../lib/format';

interface CalendarSyncModalProps {
  userId: string;
  queuedGames: Game[];
  allGames: Game[];
  goals: GamingGoal[];
  upcomingEntries: PurchaseQueueEntry[];
  onClose: () => void;
}

interface SyncItem {
  id: string;
  event: CalendarEvent;
  label: string;
  sublabel: string;
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      {icon}
      <h4 className="text-[11px] uppercase tracking-wide text-white/40 font-semibold">{title}</h4>
      <span className="text-[10px] text-white/25">({count})</span>
    </div>
  );
}

function SyncRow({
  item,
  checked,
  onToggle,
}: {
  item: SyncItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded accent-indigo-500 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-white/85 font-medium truncate">{item.label}</div>
        <div className="text-[11px] text-white/35 mt-0.5">{item.sublabel}</div>
      </div>
      <a
        href={buildGoogleCalendarUrl(item.event)}
        target="_blank"
        rel="noopener noreferrer"
        title="Add to Google Calendar"
        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors shrink-0"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

export function CalendarSyncModal({ userId, queuedGames, allGames, goals, upcomingEntries, onClose }: CalendarSyncModalProps) {
  const playPlanItems = useMemo<SyncItem[]>(() => {
    const pace = loadEstimatorSettings(userId, undefined).weeklyHours;
    const segments = buildPlaythroughTimeline(queuedGames, pace, new Date(), allGames);
    return segments.map(seg => ({
      id: `play-${seg.game.id}`,
      label: seg.game.name,
      sublabel: `${formatDate(seg.startDate.toISOString())} – ${formatDate(seg.endDate.toISOString())}${seg.isEstimatedLength ? ' (estimated)' : ''}`,
      event: {
        id: `play-${seg.game.id}`,
        title: `Play: ${seg.game.name}`,
        description: `Projected play window from your Up Next queue (~${pace}h/week pace). ${Math.round(seg.remainingHours)}h remaining.`,
        date: seg.startDate,
        endDate: seg.endDate,
      },
    }));
  }, [userId, queuedGames, allGames]);

  const releaseItems = useMemo<SyncItem[]>(() => {
    return upcomingEntries
      .filter(e => e.releaseDate)
      .map(e => ({
        id: `release-${e.id}`,
        label: e.gameName,
        sublabel: `Releases ${formatDate(e.releaseDate as string)}`,
        event: {
          id: `release-${e.id}`,
          title: `Release: ${e.gameName}`,
          description: e.isDayOneBuy ? 'Day-one buy from your Buy Queue.' : 'On your Buy Queue.',
          date: new Date(e.releaseDate as string),
        },
      }));
  }, [upcomingEntries]);

  const goalItems = useMemo<SyncItem[]>(() => {
    return goals
      .filter(g => g.status === 'active' && g.endDate)
      .map(g => ({
        id: `goal-${g.id}`,
        label: g.title,
        sublabel: `Deadline ${formatDate(g.endDate)}`,
        event: {
          id: `goal-${g.id}`,
          title: `Goal deadline: ${g.title}`,
          description: `${g.currentValue}/${g.targetValue} ${g.unit}`,
          date: new Date(g.endDate),
        },
      }));
  }, [goals]);

  const allItems = useMemo(() => [...playPlanItems, ...releaseItems, ...goalItems], [playPlanItems, releaseItems, goalItems]);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(allItems.map(i => i.id)));

  const toggle = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = allItems.filter(i => checkedIds.has(i.id)).length;

  const handleDownload = () => {
    const selected = allItems.filter(i => checkedIds.has(i.id)).map(i => i.event);
    if (selected.length === 0) return;
    const ics = generateICS(selected, 'Game Analytics');
    downloadICSFile('game-analytics-calendar.ics', ics);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-indigo-400" />
            <h3 className="text-lg font-bold text-white/90">Calendar Sync</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <CalendarPlus size={28} className="text-white/15" />
              <div className="text-[13px] text-white/40">Nothing to sync yet</div>
              <div className="text-[11px] text-white/25 max-w-xs">
                Queue up games in Up Next, track upcoming releases in your Buy Queue, or set a goal deadline — then come
                back here to drop them on your calendar.
              </div>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-white/30 leading-relaxed px-0.5">
                Export your gaming schedule to Apple Calendar, Outlook, or Google. Pick what to include, then download
                one .ics file or add individual events with one tap.
              </div>

              {playPlanItems.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader icon={<ListOrdered size={13} className="text-indigo-400" />} title="Play Plan" count={playPlanItems.length} />
                  {playPlanItems.map(item => (
                    <SyncRow key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={() => toggle(item.id)} />
                  ))}
                </div>
              )}

              {releaseItems.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader icon={<ShoppingCart size={13} className="text-amber-400" />} title="Release Reminders" count={releaseItems.length} />
                  {releaseItems.map(item => (
                    <SyncRow key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={() => toggle(item.id)} />
                  ))}
                </div>
              )}

              {goalItems.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader icon={<Target size={13} className="text-emerald-400" />} title="Goal Deadlines" count={goalItems.length} />
                  {goalItems.map(item => (
                    <SyncRow key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={() => toggle(item.id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {allItems.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 shrink-0 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-white/30">
              <Gamepad2 size={12} />
              {selectedCount} selected
            </div>
            <button
              onClick={handleDownload}
              disabled={selectedCount === 0}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors',
                selectedCount === 0
                  ? 'bg-white/5 text-white/25 cursor-not-allowed'
                  : 'bg-indigo-600/80 hover:bg-indigo-600 text-white'
              )}
            >
              <Download size={14} />
              Download Calendar (.ics)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
