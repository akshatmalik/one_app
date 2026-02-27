'use client';

import { useMemo, useState, useEffect } from 'react';
import { Calendar, Clock, Gamepad2, DollarSign, Play, CheckCircle, XCircle, Plus, Flame, TrendingUp, TrendingDown, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Game, PlayLog } from '../lib/types';
import { getAllPlayLogs, getWeekStatsForOffset, getAvailableWeeksCount, getTotalHours, getMonthlyVibe, getTimelineMilestones, getMonthlyComparison, getStreakSegments, getGameJourneyArc, getCumulativeHoursAtDate, getMonthInReviewData, parseLocalDate, getTimelineWeather, getPlotTwists, getStoryArc } from '../lib/calculations';
import { TimelinePeriodCards } from './TimelinePeriodCards';
import { QuickAddTimeModal } from './QuickAddTimeModal';
import { WeekInReview } from './WeekInReview';
import { MonthStoryMode } from './MonthStoryMode';
import { QuarterStoryMode } from './QuarterStoryMode';
import { YearStoryMode } from './YearStoryMode';
import { AwardsHub } from './AwardsHub';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { generateMonthlyRecap, generateYearChapterTitles, generateMonthChapterTitles } from '../lib/ai-game-service';
import { getQuarterInReviewData, getYearInReviewFullData } from '../lib/calculations';
import { RacingBarChart } from './RacingBarChart';
import { HoursRace } from './HoursRace';
import { ActivityFeed } from './ActivityFeed';
import { GenreEpochs } from './GenreEpochs';
import { GamingPulse } from './GamingPulse';
import { FilmstripTimeline } from './FilmstripTimeline';
import { GamingCalendar } from './GamingCalendar';
import { CumulativeHoursCounter } from './CumulativeHoursCounter';
import { StoryArcOverlay } from './StoryArcOverlay';
import clsx from 'clsx';

interface TimelineViewProps {
  games: Game[];
  gamesWithMetrics?: GameWithMetrics[];
  updateGame?: (id: string, updates: Partial<Game>) => Promise<Game>;
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

export function TimelineView({ games, gamesWithMetrics, updateGame, onLogTime, onQuickAddTime }: TimelineViewProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [aiRecaps, setAiRecaps] = useState<Record<string, string>>({});
  const [chapterTitles, setChapterTitles] = useState<Record<string, string>>({});
  const [monthChapterTitles, setMonthChapterTitles] = useState<Record<string, string>>({});
  const [expandedJourneys, setExpandedJourneys] = useState<Set<string>>(new Set());
  const [monthRecapKey, setMonthRecapKey] = useState<string | null>(null);
  const [quarterRecapConfig, setQuarterRecapConfig] = useState<{ year: number; quarter: number } | null>(null);
  const [yearRecapConfig, setYearRecapConfig] = useState<number | null>(null);
  const [awardsHubConfig, setAwardsHubConfig] = useState<{ tab: 'quarter' | 'year'; periodKey: string } | null>(null);

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

  // Timeline weather per month
  const monthWeather = useMemo(() => {
    const weather: Record<string, ReturnType<typeof getTimelineWeather>> = {};
    monthKeys.forEach(mk => {
      const [y, m] = mk.split('-');
      weather[mk] = getTimelineWeather(games, parseInt(y), parseInt(m));
    });
    return weather;
  }, [games, monthKeys]);

  // Plot twists (dramatic behavioral events)
  const plotTwists = useMemo(() => getPlotTwists(games), [games]);

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

  // Quarter recap data (computed on demand when modal opens)
  const quarterRecapData = useMemo(() => {
    if (!quarterRecapConfig) return null;
    return getQuarterInReviewData(games, quarterRecapConfig.year, quarterRecapConfig.quarter);
  }, [quarterRecapConfig, games]);

  // Year recap data (computed on demand)
  const yearRecapData = useMemo(() => {
    if (yearRecapConfig === null) return null;
    return getYearInReviewFullData(games, yearRecapConfig);
  }, [yearRecapConfig, games]);

  // Derive unique years from monthKeys for year boundary rendering
  const yearsWithData = useMemo(() => {
    const years = new Set<number>();
    monthKeys.forEach(mk => years.add(parseInt(mk.split('-')[0])));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthKeys]);

  // Per-year aggregates for year boundary banner
  const yearTotals = useMemo(() => {
    const totals: Record<number, { hours: number; games: Set<string>; completions: number }> = {};
    events.forEach(event => {
      const year = parseInt(event.date.substring(0, 4));
      if (!totals[year]) totals[year] = { hours: 0, games: new Set(), completions: 0 };
      if (event.type === 'play') { totals[year].hours += event.hours || 0; totals[year].games.add(event.game.id); }
      if (event.type === 'complete') totals[year].completions++;
    });
    return totals;
  }, [events]);

  // Helper: return the ISO week's Monday date string for any date string
  const getWeekStartStr = (dateStr: string): string => {
    const date = parseLocalDate(dateStr);
    const day = date.getDay() || 7; // 1=Mon … 7=Sun
    const monday = new Date(date);
    monday.setDate(date.getDate() - (day - 1));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper: how many weeks ago was the week that starts on weekStartStr?
  const computeWeekOffset = (weekStartStr: string): number => {
    const today = new Date();
    const todayDay = today.getDay() || 7;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - (todayDay - 1));
    currentMonday.setHours(0, 0, 0, 0);
    const weekMonday = parseLocalDate(weekStartStr);
    const diffMs = currentMonday.getTime() - weekMonday.getTime();
    return Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
  };

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
        <WeekInReview data={weekInReviewData} allGames={games} weekOffset={weekOffset} maxWeeksBack={maxWeeksBack} onWeekChange={handleWeekChange} updateGame={updateGame} />
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

  // Track which quarter/year we're in for boundary title display
  let lastQuarter = '';
  let lastYear = '';

  return (
    <div className="space-y-6">
      {/* Month Recap Modal */}
      {monthRecapData && monthRecapKey && (
        <MonthStoryMode
          data={monthRecapData}
          allGames={games}
          onClose={() => setMonthRecapKey(null)}
          monthTitle={monthChapterTitles[monthRecapKey]}
          updateGame={updateGame}
        />
      )}

      {/* Quarter Recap Modal */}
      {quarterRecapData && quarterRecapConfig && (
        <QuarterStoryMode
          data={quarterRecapData}
          allGames={games}
          onClose={() => setQuarterRecapConfig(null)}
          quarterTitle={chapterTitles[`Q${quarterRecapConfig.quarter}`]}
          updateGame={updateGame}
        />
      )}

      {/* Year Recap Modal */}
      {yearRecapData && yearRecapConfig !== null && (
        <YearStoryMode
          data={yearRecapData}
          allGames={games}
          onClose={() => setYearRecapConfig(null)}
          yearTitle={chapterTitles[`${yearRecapConfig}`]}
          chapterTitles={chapterTitles}
          updateGame={updateGame}
        />
      )}

      {/* Awards Hub */}
      {awardsHubConfig && updateGame && (
        <AwardsHub
          allGames={gamesWithMetrics || (games as GameWithMetrics[])}
          rawGames={games}
          updateGame={updateGame}
          onClose={() => setAwardsHubConfig(null)}
          initialTab={awardsHubConfig.tab}
          initialPeriodKey={awardsHubConfig.periodKey}
        />
      )}

      <WeekInReview data={weekInReviewData} allGames={games} weekOffset={weekOffset} maxWeeksBack={maxWeeksBack} onWeekChange={handleWeekChange} updateGame={updateGame} />

      {/* Hours Race — daily/monthly/lifetime racing bar chart */}
      <HoursRace games={games} />

      {/* Filmstrip — horizontal month snapshots */}
      <FilmstripTimeline games={games} />

      {/* Gaming Pulse + Genre Epochs side by side on larger screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GamingPulse games={games} />
        <GenreEpochs games={games} />
      </div>

      {/* Cumulative Hours Counter */}
      <CumulativeHoursCounter games={games} />

      {/* Gaming Calendar */}
      <GamingCalendar games={games} />

      <TimelinePeriodCards games={games} />

      {/* Story Arc — yearly narrative structure */}
      <StoryArcOverlay games={games} />

      {/* Plot Twists — dramatic behavioral events */}
      {plotTwists.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-2">
            <span>⚡</span> Plot Twists
          </h3>
          <div className="space-y-1.5">
            {plotTwists.slice(0, 5).map(twist => (
              <div
                key={twist.id}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                  twist.severity === 'epic' ? 'bg-yellow-500/5 border-yellow-500/15' :
                  twist.severity === 'major' ? 'bg-purple-500/5 border-purple-500/15' :
                  'bg-white/[0.02] border-white/5',
                )}
              >
                <span className="text-xl shrink-0">{twist.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/70">{twist.title}</div>
                  <div className="text-[10px] text-white/35">{twist.description}</div>
                </div>
                <div className="text-[9px] text-white/20 shrink-0">{twist.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          const weather = monthWeather[monthKey];
          const comparison = monthComparisons[monthKey];
          const streaks = monthStreaks[monthKey];
          const thumbs = monthThumbnails[monthKey];
          const totals = monthlyTotals[monthKey];
          const recap = aiRecaps[monthKey];
          const yearOfMonth = parseInt(monthKey.split('-')[0]);
          const showYearBoundary = String(yearOfMonth) !== lastYear;
          lastYear = String(yearOfMonth);
          const quarter = getQuarterKey(monthKey);
          const showChapterTitle = quarter !== lastQuarter && chapterTitles[quarter];
          lastQuarter = quarter;

          // Group same-day events
          const dayGroups = groupEventsByDay(monthEvents);
          const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

          return (
            <div key={monthKey} className="card-enter" style={{ animationDelay: `${monthIdx * 80}ms` }}>
              {/* Year boundary banner — rendered at first month of each new year */}
              {showYearBoundary && (() => {
                const yt = yearTotals[yearOfMonth];
                return (
                  <div className="mb-5">
                    <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/8 via-amber-500/4 to-transparent p-5">
                      <div className="absolute -top-6 -right-6 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-5xl font-black text-amber-500/20 leading-none mb-2 select-none">{yearOfMonth}</div>
                          <div className="flex items-center gap-3 flex-wrap text-[10px] text-white/30">
                            {yt && yt.hours > 0 && <span className="text-amber-400/60">{yt.hours.toFixed(0)}h played</span>}
                            {yt && yt.games.size > 0 && <span>{yt.games.size} games</span>}
                            {yt && yt.completions > 0 && <span>{yt.completions} completed</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setYearRecapConfig(yearOfMonth)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 text-xs font-bold transition-all"
                          >
                            <span>🎬</span>
                            <span>Year in Review</span>
                          </button>
                          {updateGame && (
                            <button
                              onClick={() => setAwardsHubConfig({ tab: 'year', periodKey: `${yearOfMonth}` })}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/15 text-amber-400/70 text-xs font-bold transition-all"
                            >
                              <span>🏆</span>
                              <span>Awards</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quarter chapter title — grand segment banner */}
              {showChapterTitle && (() => {
                const qYear = parseInt(monthKey.split('-')[0]);
                const qNum = parseInt(quarter.replace('Q', ''));
                const qMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'].slice((qNum - 1) * 3, qNum * 3);
                const qKeys = qMonths.map(m => `${qYear}-${m}`);
                const qHours = qKeys.reduce((s, k) => s + (monthlyTotals[k]?.hours || 0), 0);
                const qGames = new Set(qKeys.flatMap(k => Array.from(monthlyTotals[k]?.games || new Set<string>())));
                const qCompletions = qKeys.reduce((s, k) => s + (monthlyTotals[k]?.completions || 0), 0);
                return (
                  <div className="mb-5">
                    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/8 via-purple-500/4 to-transparent p-4">
                      <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={11} className="text-purple-400/70 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400/50">{quarter} · {qYear}</span>
                          </div>
                          <div className="text-sm font-bold text-purple-300 leading-snug truncate">
                            {chapterTitles[quarter]}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                            {qHours > 0 && <span>{qHours.toFixed(0)}h played</span>}
                            {qGames.size > 0 && <span>{qGames.size} games</span>}
                            {qCompletions > 0 && <span>{qCompletions} completed</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setQuarterRecapConfig({ year: qYear, quarter: qNum })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 text-xs font-semibold transition-all"
                          >
                            <span>📖</span>
                            <span>Recap</span>
                          </button>
                          {updateGame && (
                            <button
                              onClick={() => setAwardsHubConfig({ tab: 'quarter', periodKey: `${qYear}-Q${qNum}` })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/15 text-purple-400/70 text-xs font-semibold transition-all"
                            >
                              <span>🏆</span>
                              <span>Awards</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  {/* Weather badge */}
                  {weather && (
                    <span
                      title={weather.tooltip}
                      className="text-base cursor-default select-none"
                      style={{ filter: `drop-shadow(0 0 4px ${weather.color}60)` }}
                    >
                      {weather.icon}
                    </span>
                  )}
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

              {/* Events grouped by week, then by day */}
              <div className="space-y-2 relative">
                <div className="absolute left-6 top-3 bottom-3 w-px bg-gradient-to-b from-white/8 via-white/5 to-transparent" />

                {(() => {
                  // Group sorted days by ISO week start (Monday)
                  const daysByWeek = new Map<string, string[]>();
                  sortedDays.forEach(dayDate => {
                    const wk = getWeekStartStr(dayDate);
                    if (!daysByWeek.has(wk)) daysByWeek.set(wk, []);
                    daysByWeek.get(wk)!.push(dayDate);
                  });
                  const sortedWeekStarts = Array.from(daysByWeek.keys()).sort((a, b) => b.localeCompare(a));

                  return sortedWeekStarts.map(weekStart => {
                    const weekDays = daysByWeek.get(weekStart)!;
                    const weekEndDate = new Date(parseLocalDate(weekStart));
                    weekEndDate.setDate(weekEndDate.getDate() + 6);

                    // Week totals for the mini-header
                    const weekPlayEvents = weekDays.flatMap(d => (dayGroups[d] || []).filter(e => e.type === 'play'));
                    const weekHours = weekPlayEvents.reduce((s, e) => s + (e.hours || 0), 0);
                    const weekSessions = weekPlayEvents.length;
                    const wkOffset = computeWeekOffset(weekStart);

                    const startLabel = parseLocalDate(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const endLabel = weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    return (
                      <div key={weekStart}>
                        {/* Week sub-segment header — only when there is play activity */}
                        {weekSessions > 0 && (
                          <div className="flex items-center gap-2 pt-2 pb-1 mb-1">
                            <span className="text-[10px] text-white/25 font-medium tracking-wide whitespace-nowrap">{startLabel} – {endLabel}</span>
                            <span className="text-[10px] text-blue-400/50">{weekHours.toFixed(1)}h</span>
                            {weekSessions > 1 && <span className="text-[10px] text-white/20">{weekSessions} sessions</span>}
                            <div className="flex-1 h-px bg-white/[0.04]" />
                            <button
                              onClick={() => { setWeekOffset(wkOffset); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] hover:bg-purple-500/10 text-white/25 hover:text-purple-400 transition-all whitespace-nowrap"
                            >
                              View Recap
                            </button>
                          </div>
                        )}

                        {/* Days within this week */}
                        <div className="space-y-2">
                          {weekDays.map(dayDate => {
                            const dayEvents = dayGroups[dayDate];
                            const isMultiEvent = dayEvents.length > 2;

                            if (isMultiEvent) {
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

                            // Normal events (1–2 per day)
                            return dayEvents.map(event => renderEvent(event));
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/50">Activity Feed</h3>
        <ActivityFeed games={games} />
      </div>

      {showQuickAdd && onQuickAddTime && (
        <QuickAddTimeModal games={games} onSave={handleQuickAddTime} onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}
