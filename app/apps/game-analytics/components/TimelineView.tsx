'use client';

import { useMemo, useState, useEffect } from 'react';
import { Calendar, Clock, Gamepad2, DollarSign, Play, CheckCircle, XCircle, Plus, Flame, TrendingUp, TrendingDown, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { getAllPlayLogs, getWeekStatsForOffset, getAvailableWeeksCount, getTotalHours, getMonthlyVibe, getTimelineMilestones, getMonthlyComparison, getStreakSegments, getGameJourneyArc, getCumulativeHoursAtDate, getMonthInReviewData, parseLocalDate } from '../lib/calculations';
import { TimelinePeriodCards } from './TimelinePeriodCards';
import { QuickAddTimeModal } from './QuickAddTimeModal';
import { WeekInReview } from './WeekInReview';
import { MonthStoryMode } from './MonthStoryMode';
import { generateMonthlyRecap, generateYearChapterTitles, generateMonthChapterTitles } from '../lib/ai-game-service';
import { RacingBarChart } from './RacingBarChart';
import clsx from 'clsx';

interface TimelineViewProps {
  games: Game[];
  onLogTime?: (game: Game) => void;
  onQuickAddTime?: (gameId: string, playLog: PlayLog) => Promise<void>;
}

type TimelineEvent = {
  id: string;
  date: string;
  type: 'play' | 'purchase' | 'start' | 'complete' | 'abandon' | 'milestone';
  game: Game;
  hours?: number;
  notes?: string;
  price?: number;
  milestoneTitle?: string;
  milestoneDescription?: string;
  milestoneIcon?: string;
  milestoneColor?: string;
};

export function TimelineView({ games, onLogTime, onQuickAddTime }: TimelineViewProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [aiRecaps, setAiRecaps] = useState<Record<string, string>>({});
  const [chapterTitles, setChapterTitles] = useState<Record<string, string>>({});
  const [monthChapterTitles, setMonthChapterTitles] = useState<Record<string, string>>({});
  const [expandedJourneys, setExpandedJourneys] = useState<Set<string>>(new Set());
  const [monthRecapKey, setMonthRecapKey] = useState<string | null>(null);

  const maxWeeksBack = useMemo(() => {
    return Math.max(1, getAvailableWeeksCount(games));
  }, [games]);

  const weekInReviewData = useMemo(() => {
    return getWeekStatsForOffset(games, weekOffset);
  }, [games, weekOffset]);

  const handleWeekChange = (offset: number) => {
    setWeekOffset(offset);
  };

  // Build all events including milestones
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];
    const dummyGame = games[0]; // fallback for milestone events

    games.forEach(game => {
      if (game.datePurchased && game.status !== 'Wishlist') {
        allEvents.push({ id: `purchase-${game.id}`, date: game.datePurchased, type: 'purchase', game, price: game.price });
      }
      if (game.startDate) {
        allEvents.push({ id: `start-${game.id}`, date: game.startDate, type: 'start', game });
      }
      if (game.endDate) {
        allEvents.push({ id: `end-${game.id}`, date: game.endDate, type: game.status === 'Abandoned' ? 'abandon' : 'complete', game });
      }
      if (game.playLogs) {
        game.playLogs.forEach(log => {
          allEvents.push({ id: `play-${log.id}`, date: log.date, type: 'play', game, hours: log.hours, notes: log.notes });
        });
      }
    });

    // Inject milestones
    if (dummyGame) {
      const milestones = getTimelineMilestones(games);
      milestones.forEach(m => {
        allEvents.push({
          id: m.id,
          date: m.date,
          type: 'milestone',
          game: dummyGame, // milestone events need a game ref but display differently
          milestoneTitle: m.title,
          milestoneDescription: m.description,
          milestoneIcon: m.icon,
          milestoneColor: m.color,
        });
      });
    }

    return allEvents.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
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

  // Sorted month keys
  const monthKeys = useMemo(() => {
    return Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));
  }, [groupedEvents]);

  // Monthly vibes
  const monthVibes = useMemo(() => {
    const vibes: Record<string, { tag: string; emoji: string; color: string }> = {};
    Object.entries(groupedEvents).forEach(([monthKey, monthEvents]) => {
      vibes[monthKey] = getMonthlyVibe(monthEvents, monthKey);
    });
    return vibes;
  }, [groupedEvents]);

  // Monthly comparisons
  const monthComparisons = useMemo(() => {
    const comps: Record<string, ReturnType<typeof getMonthlyComparison>> = {};
    for (let i = 0; i < monthKeys.length - 1; i++) {
      const current = monthKeys[i];
      const previous = monthKeys[i + 1];
      if (groupedEvents[current] && groupedEvents[previous]) {
        comps[current] = getMonthlyComparison(groupedEvents[current], groupedEvents[previous]);
      }
    }
    return comps;
  }, [groupedEvents, monthKeys]);

  // Streak segments per month
  const monthStreaks = useMemo(() => {
    const streaks: Record<string, ReturnType<typeof getStreakSegments>> = {};
    Object.entries(groupedEvents).forEach(([monthKey, monthEvents]) => {
      const playEvents = monthEvents.filter(e => e.type === 'play').map(e => ({ date: e.date, hours: e.hours }));
      const segments = getStreakSegments(playEvents);
      if (segments.length > 0) streaks[monthKey] = segments;
    });
    return streaks;
  }, [groupedEvents]);

  // Game journey arcs (for completed/abandoned games)
  const journeyArcs = useMemo(() => {
    return games
      .map(g => getGameJourneyArc(g))
      .filter((arc): arc is NonNullable<typeof arc> => arc !== null)
      .sort((a, b) => {
        const aDate = a.events[a.events.length - 1]?.date || '';
        const bDate = b.events[b.events.length - 1]?.date || '';
        return bDate.localeCompare(aDate);
      });
  }, [games]);

  // Month thumbnail collage
  const monthThumbnails = useMemo(() => {
    const thumbs: Record<string, string[]> = {};
    Object.entries(groupedEvents).forEach(([monthKey, monthEvents]) => {
      const uniqueThumbs = [...new Set(
        monthEvents
          .filter(e => e.game.thumbnail)
          .map(e => e.game.thumbnail!)
      )].slice(0, 6);
      if (uniqueThumbs.length > 0) thumbs[monthKey] = uniqueThumbs;
    });
    return thumbs;
  }, [groupedEvents]);

  // Same-day grouping
  const groupEventsByDay = (monthEvents: TimelineEvent[]) => {
    const dayGroups: Record<string, TimelineEvent[]> = {};
    monthEvents.forEach(e => {
      if (!dayGroups[e.date]) dayGroups[e.date] = [];
      dayGroups[e.date].push(e);
    });
    return dayGroups;
  };

  // Load AI recaps lazily
  useEffect(() => {
    const loadRecaps = async () => {
      // Only load for first 3 months
      const topMonths = monthKeys.slice(0, 3);
      for (const mk of topMonths) {
        if (aiRecaps[mk]) continue;
        try {
          const evts = groupedEvents[mk].map(e => ({
            type: e.type,
            game: { name: e.game.name, genre: e.game.genre },
            hours: e.hours,
            price: e.price,
          }));
          const recap = await generateMonthlyRecap(mk, evts);
          if (recap) {
            setAiRecaps(prev => ({ ...prev, [mk]: recap }));
          }
        } catch {
          // ignore
        }
      }
    };
    if (monthKeys.length > 0) loadRecaps();
  }, [monthKeys.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load chapter titles
  useEffect(() => {
    const loadTitles = async () => {
      try {
        const titles = await generateYearChapterTitles(games);
        setChapterTitles(titles);
      } catch {
        // ignore
      }
    };
    if (games.length > 0) loadTitles();
  }, [games.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load month chapter titles
  useEffect(() => {
    const loadMonthTitles = async () => {
      try {
        const topMonths = monthKeys.slice(0, 6);
        if (topMonths.length === 0) return;
        const titles = await generateMonthChapterTitles(games, topMonths);
        setMonthChapterTitles(titles);
      } catch {
        // ignore
      }
    };
    if (monthKeys.length > 0 && games.length > 0) loadMonthTitles();
  }, [monthKeys.length, games.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // parseLocalDate imported from calculations

  // Get quarter key for a month
  const getQuarterKey = (monthKey: string) => {
    const month = parseInt(monthKey.split('-')[1]);
    return `Q${Math.ceil(month / 3)}`;
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'play': return <Play size={14} className="text-blue-400" />;
      case 'purchase': return <DollarSign size={14} className="text-emerald-400" />;
      case 'start': return <Gamepad2 size={14} className="text-purple-400" />;
      case 'complete': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'abandon': return <XCircle size={14} className="text-red-400" />;
      case 'milestone': return <Sparkles size={14} className="text-yellow-400" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'play': return 'bg-blue-500/20 border-blue-500/30';
      case 'purchase': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'start': return 'bg-purple-500/20 border-purple-500/30';
      case 'complete': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'abandon': return 'bg-red-500/20 border-red-500/30';
      case 'milestone': return 'bg-yellow-500/20 border-yellow-500/30';
    }
  };

  const getEventLabel = (event: TimelineEvent) => {
    switch (event.type) {
      case 'play': {
        const cumHours = getCumulativeHoursAtDate(event.game, event.date);
        return `Played for ${event.hours}h (${cumHours}h total)`;
      }
      case 'purchase': return `Purchased for $${event.price}`;
      case 'start': return 'Started playing';
      case 'complete': {
        const totalH = getTotalHours(event.game);
        return `Completed — ${totalH}h total`;
      }
      case 'abandon': return 'Abandoned';
      case 'milestone': return event.milestoneDescription || '';
    }
  };

  const monthlyTotals = useMemo(() => {
    const totals: Record<string, { hours: number; sessions: number; games: Set<string>; purchases: number; completions: number; spent: number }> = {};
    events.forEach(event => {
      const monthKey = event.date.substring(0, 7);
      if (!totals[monthKey]) {
        totals[monthKey] = { hours: 0, sessions: 0, games: new Set(), purchases: 0, completions: 0, spent: 0 };
      }
      if (event.type === 'play') {
        totals[monthKey].hours += event.hours || 0;
        totals[monthKey].sessions += 1;
        totals[monthKey].games.add(event.game.id);
      }
      if (event.type === 'purchase') {
        totals[monthKey].purchases += 1;
        totals[monthKey].spent += event.price || 0;
      }
      if (event.type === 'complete') {
        totals[monthKey].completions += 1;
      }
    });
    return totals;
  }, [events]);

  const handleQuickAddTime = async (gameId: string, playLog: PlayLog) => {
    if (onQuickAddTime) {
      await onQuickAddTime(gameId, playLog);
    }
  };

  // Render a single event
  const renderEvent = (event: TimelineEvent) => {
    // Milestone events get special treatment
    if (event.type === 'milestone') {
      return (
        <div key={event.id} className="flex items-start gap-4 relative card-enter">
          <div className="relative z-10 shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-yellow-500/30 bg-yellow-500/10 milestone-star">
              <span className="text-xl">{event.milestoneIcon}</span>
            </div>
          </div>
          <div className="flex-1 pt-0.5">
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-sm">{event.milestoneTitle}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">{event.milestoneDescription}</p>
            </div>
          </div>
          <div className="text-xs text-white/30 shrink-0 pt-2">
            {parseLocalDate(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      );
    }

    return (
      <div key={event.id} className="flex items-start gap-4 relative card-enter">
        <div className="relative z-10 shrink-0">
          {event.game.thumbnail ? (
            <div className="relative">
              <img
                src={event.game.thumbnail}
                alt={event.game.name}
                className={clsx(
                  'w-12 h-12 rounded-xl object-cover border',
                  event.type === 'complete' ? 'border-emerald-500/30' : 'border-white/10'
                )}
                loading="lazy"
              />
              <div className={clsx(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center border border-[#0a0a0f]',
                getEventColor(event.type)
              )}>
                <div className="scale-50">{getEventIcon(event.type)}</div>
              </div>
            </div>
          ) : (
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center border', getEventColor(event.type))}>
              {getEventIcon(event.type)}
            </div>
          )}
        </div>

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
                {event.type === 'complete' && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                    Finished!
                  </span>
                )}
                {onLogTime && event.game.status !== 'Wishlist' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onLogTime(event.game); }}
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
              {parseLocalDate(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Month recap data (must be before any early returns to satisfy hooks rules)
  const monthRecapData = useMemo(() => {
    if (!monthRecapKey) return null;
    const [y, m] = monthRecapKey.split('-');
    return getMonthInReviewData(games, parseInt(y), parseInt(m));
  }, [monthRecapKey, games]);

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <WeekInReview data={weekInReviewData} allGames={games} weekOffset={weekOffset} maxWeeksBack={maxWeeksBack} onWeekChange={handleWeekChange} />
        <TimelinePeriodCards games={games} />
        {onQuickAddTime && (
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowQuickAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-sm font-medium">
              <Plus size={16} /> Add Play Time
            </button>
          </div>
        )}
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto mb-4 text-white/10" />
          <p className="text-white/30 text-sm">No timeline events yet</p>
          <p className="text-white/20 text-xs mt-1">Add games with dates or log play sessions to see your timeline</p>
        </div>
        {showQuickAdd && onQuickAddTime && (
          <QuickAddTimeModal games={games} onSave={handleQuickAddTime} onClose={() => setShowQuickAdd(false)} />
        )}
      </div>
    );
  }

  // Track which quarter we're in for chapter title display
  let lastQuarter = '';

  return (
    <div className="space-y-6">
      {/* Month Recap Modal */}
      {monthRecapData && monthRecapKey && (
        <MonthStoryMode
          data={monthRecapData}
          allGames={games}
          onClose={() => setMonthRecapKey(null)}
          monthTitle={monthChapterTitles[monthRecapKey]}
        />
      )}

      <WeekInReview data={weekInReviewData} allGames={games} weekOffset={weekOffset} maxWeeksBack={maxWeeksBack} onWeekChange={handleWeekChange} />

      {/* Racing Bar Chart — hero visualization */}
      <RacingBarChart games={games} />

      <TimelinePeriodCards games={games} />

      {/* Game Journey Arcs */}
      {journeyArcs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
            <Flame size={14} className="text-orange-400" />
            Game Journeys
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {journeyArcs.slice(0, expandedJourneys.has('all') ? undefined : 4).map(arc => (
              <div key={arc.game.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  {arc.game.thumbnail && (
                    <img src={arc.game.thumbnail} alt={arc.game.name} className="w-8 h-8 rounded-lg object-cover" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 font-medium truncate">{arc.game.name}</div>
                    <div className="text-[10px] text-white/30">{arc.totalDays} days · {arc.totalHours}h</div>
                  </div>
                </div>
                {/* Journey dots */}
                <div className="flex items-center gap-1">
                  {arc.events.map((evt, i) => (
                    <div key={i} className="flex items-center">
                      <div className={clsx(
                        'w-2 h-2 rounded-full',
                        evt.type === 'purchase' && 'bg-emerald-400',
                        evt.type === 'start' && 'bg-purple-400',
                        evt.type === 'complete' && 'bg-emerald-400',
                        evt.type === 'abandon' && 'bg-red-400',
                      )} title={evt.label} />
                      {i < arc.events.length - 1 && (
                        <div className="w-4 h-px bg-white/10 mx-0.5" />
                      )}
                    </div>
                  ))}
                  <span className="text-[10px] text-white/25 ml-2">
                    {arc.events.map(e => e.type === 'purchase' ? '💰' : e.type === 'start' ? '▶' : e.type === 'complete' ? '✅' : '❌').join(' → ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {journeyArcs.length > 4 && !expandedJourneys.has('all') && (
            <button
              onClick={() => setExpandedJourneys(prev => new Set(prev).add('all'))}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Show all {journeyArcs.length} journeys
            </button>
          )}
        </div>
      )}

      {onQuickAddTime && (
        <div className="flex justify-end">
          <button onClick={() => setShowQuickAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-sm font-medium">
            <Plus size={16} /> Add Play Time
          </button>
        </div>
      )}

      {/* Timeline Events by Month */}
      <div className="space-y-8">
        {monthKeys.map((monthKey, monthIdx) => {
          const monthEvents = groupedEvents[monthKey];
          const vibe = monthVibes[monthKey];
          const comparison = monthComparisons[monthKey];
          const streaks = monthStreaks[monthKey];
          const thumbs = monthThumbnails[monthKey];
          const totals = monthlyTotals[monthKey];
          const recap = aiRecaps[monthKey];
          const quarter = getQuarterKey(monthKey);
          const showChapterTitle = quarter !== lastQuarter && chapterTitles[quarter];
          lastQuarter = quarter;

          // Group same-day events
          const dayGroups = groupEventsByDay(monthEvents);
          const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

          return (
            <div key={monthKey} className="card-enter" style={{ animationDelay: `${monthIdx * 80}ms` }}>
              {/* Quarter chapter title */}
              {showChapterTitle && (
                <div className="flex items-center gap-3 mb-4 pb-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">{chapterTitles[quarter]}</span>
                  <span className="text-[10px] text-white/20">{quarter}</span>
                  <div className="flex-1 h-px bg-purple-500/10" />
                </div>
              )}

              {/* Month chapter title */}
              {monthChapterTitles[monthKey] && (
                <div className="flex items-center gap-2.5 mb-3 pb-1">
                  <Sparkles size={12} className="text-cyan-400" />
                  <span className="text-xs font-semibold text-cyan-400 italic">{monthChapterTitles[monthKey]}</span>
                  <div className="flex-1 h-px bg-cyan-500/10" />
                </div>
              )}

              {/* Month Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{formatMonth(monthKey)}</h3>
                  {/* Vibe tag */}
                  {vibe && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium vibe-pulse" style={{ color: vibe.color, backgroundColor: `${vibe.color}15`, borderColor: `${vibe.color}20` }}>
                      {vibe.emoji} {vibe.tag}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-white/5" />
                  <button
                    onClick={() => setMonthRecapKey(monthKey)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-xs text-purple-400 transition-all"
                  >
                    <Sparkles size={10} />
                    <span>Recap</span>
                  </button>
                  <span className="text-xs text-white/30">{monthEvents.length} events</span>
                </div>

                {/* Month stats bar */}
                {totals && (
                  <div className="flex items-center gap-4 text-xs mb-2">
                    <span className="text-purple-400 font-medium">{totals.hours.toFixed(1)}h played</span>
                    <span className="text-white/30">{totals.sessions} sessions</span>
                    <span className="text-white/30">{totals.games.size} games</span>
                    {totals.purchases > 0 && <span className="text-emerald-400">{totals.purchases} bought · ${totals.spent}</span>}
                    {totals.completions > 0 && <span className="text-emerald-400">{totals.completions} completed</span>}
                  </div>
                )}

                {/* Monthly comparison */}
                {comparison && (comparison.hoursDelta !== 0 || comparison.sessionsDelta !== 0) && (
                  <div className="flex items-center gap-3 text-[10px] text-white/30">
                    <span>vs last month:</span>
                    <span className={clsx(comparison.hoursDirection === 'up' ? 'text-emerald-400' : comparison.hoursDirection === 'down' ? 'text-red-400' : 'text-white/30')}>
                      {comparison.hoursDelta > 0 ? '+' : ''}{comparison.hoursDelta.toFixed(1)}h
                    </span>
                    {comparison.sessionsDelta !== 0 && (
                      <span className={clsx(comparison.sessionsDelta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {comparison.sessionsDelta > 0 ? '+' : ''}{comparison.sessionsDelta} sessions
                      </span>
                    )}
                    {comparison.completionsDelta > 0 && (
                      <span className="text-emerald-400">+{comparison.completionsDelta} completed</span>
                    )}
                  </div>
                )}

                {/* Thumbnail collage */}
                {thumbs && thumbs.length > 1 && (
                  <div className="flex items-center gap-1 mt-2">
                    {thumbs.map((thumb, i) => (
                      <img key={i} src={thumb} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/5 opacity-60 hover:opacity-100 transition-opacity" loading="lazy" />
                    ))}
                  </div>
                )}

                {/* AI recap */}
                {recap && (
                  <div className="mt-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-start gap-2">
                      <Sparkles size={10} className="text-purple-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-white/40 leading-relaxed">{recap}</p>
                    </div>
                  </div>
                )}

                {/* Streak highlights */}
                {streaks && streaks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {streaks.map((streak, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg streak-glow border border-yellow-500/10">
                        <Flame size={10} className="text-yellow-400" />
                        <span className="text-[10px] text-yellow-400 font-medium">{streak.days}-day streak</span>
                        <span className="text-[10px] text-white/25">{streak.totalHours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Events grouped by day */}
              <div className="space-y-2 relative">
                <div className="absolute left-6 top-3 bottom-3 w-px bg-gradient-to-b from-white/8 via-white/5 to-transparent" />

                {sortedDays.map(dayDate => {
                  const dayEvents = dayGroups[dayDate];
                  const isMultiEvent = dayEvents.length > 2;

                  if (isMultiEvent) {
                    // Same-day grouping: show as a grouped card
                    const totalDayHours = dayEvents.filter(e => e.type === 'play').reduce((s, e) => s + (e.hours || 0), 0);
                    const uniqueGames = [...new Set(dayEvents.map(e => e.game.name))];
                    return (
                      <div key={dayDate} className="relative">
                        <div className="flex items-start gap-4">
                          <div className="relative z-10 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center">
                              <span className="text-xs font-bold text-white/60">
                                {parseLocalDate(dayDate).getDate()}
                              </span>
                              <span className="text-[8px] text-white/30 uppercase">
                                {parseLocalDate(dayDate).toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-white/70 font-medium">{dayEvents.length} events</span>
                              {totalDayHours > 0 && <span className="text-xs text-blue-400">{totalDayHours}h played</span>}
                              <span className="text-[10px] text-white/25">{uniqueGames.join(', ')}</span>
                            </div>
                            <div className="space-y-1.5">
                              {dayEvents.map(event => (
                                <div key={event.id} className="flex items-center gap-2 text-xs">
                                  <div className="scale-75">{getEventIcon(event.type)}</div>
                                  <span className="text-white/60">{event.game.name}</span>
                                  <span className="text-white/30">{getEventLabel(event)}</span>
                                  {event.notes && <span className="text-white/20 italic truncate">&ldquo;{event.notes}&rdquo;</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Normal events (1-2 per day)
                  return dayEvents.map(event => renderEvent(event));
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showQuickAdd && onQuickAddTime && (
        <QuickAddTimeModal games={games} onSave={handleQuickAddTime} onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}
