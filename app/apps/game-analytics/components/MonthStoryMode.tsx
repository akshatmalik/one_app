'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar, Sparkles, Trophy, Flame, TrendingUp, TrendingDown, Minus, Gamepad2, DollarSign, Clock, BarChart3, Zap, Award, Star } from 'lucide-react';
import { MonthInReviewData } from '../lib/calculations';
import { Game } from '../lib/types';

interface MonthStoryModeProps {
  data: MonthInReviewData;
  allGames: Game[];
  onClose: () => void;
  monthTitle?: string;
}

export function MonthStoryMode({ data, allGames, onClose, monthTitle }: MonthStoryModeProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);

  const screens = useMemo(() => [
    // Title Card
    <TitleCardScreen key="title" data={data} monthTitle={monthTitle} />,
    // Month in Numbers
    <MonthInNumbersScreen key="numbers" data={data} />,
    // Top 3 Games
    data.top3Games.length > 0 ? <Top3Screen key="top3" data={data} /> : null,
    // Game of the Month
    data.topGame ? <GameOfTheMonthScreen key="gotm" data={data} /> : null,
    // Activity Heatmap
    data.dailyHours.length > 0 ? <ActivityCalendarScreen key="calendar" data={data} /> : null,
    // Week by Week
    data.weeklyHours.length > 1 ? <WeekByWeekScreen key="weeks" data={data} /> : null,
    // Genre Breakdown
    data.genreBreakdown.length > 1 ? <GenreScreen key="genres" data={data} /> : null,
    // Spending
    data.totalSpent > 0 ? <SpendingScreen key="spending" data={data} /> : null,
    // Completions
    (data.completedGames.length > 0 || data.newGamesStarted.length > 0) ? <CompletionsScreen key="completions" data={data} /> : null,
    // Best Value
    data.bestValueGame ? <BestValueScreen key="value" data={data} /> : null,
    // vs Last Month
    <VsLastMonthScreen key="vs" data={data} />,
    // Biggest Day
    data.biggestDay ? <BiggestDayScreen key="biggest" data={data} /> : null,
    // Personality
    <PersonalityScreen key="personality" data={data} />,
    // Closing
    <ClosingScreen key="closing" data={data} monthTitle={monthTitle} />,
  ].filter(Boolean), [data, monthTitle]);

  const totalScreens = screens.length;

  const goToNext = useCallback(() => {
    if (currentScreen < totalScreens - 1) {
      setDirection(1);
      setCurrentScreen(prev => prev + 1);
    }
  }, [currentScreen, totalScreens]);

  const goToPrev = useCallback(() => {
    if (currentScreen > 0) {
      setDirection(-1);
      setCurrentScreen(prev => prev - 1);
    }
  }, [currentScreen]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goToPrev();
    else goToNext();
  }, [goToNext, goToPrev]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') goToNext();
    else if (e.key === 'ArrowLeft') goToPrev();
    else if (e.key === 'Escape') onClose();
  }, [goToNext, goToPrev, onClose]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0a14] flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      {/* Progress dots */}
      <div className="flex items-center gap-1 px-4 py-3 justify-center">
        {screens.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === currentScreen ? 24 : 8,
              backgroundColor: i === currentScreen ? '#fff' : i < currentScreen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white">
        <X size={24} />
      </button>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden cursor-pointer" onClick={handleClick}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center px-6"
          >
            {screens[currentScreen]}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows (desktop) */}
        {currentScreen > 0 && (
          <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white">
            <ChevronLeft size={32} />
          </button>
        )}
        {currentScreen < totalScreens - 1 && (
          <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white">
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Bottom counter */}
      <div className="text-center py-3 text-xs text-white/30">
        {currentScreen + 1} / {totalScreens}
      </div>
    </div>
  );
}

// ── SCREEN COMPONENTS ──────────────────────────────────────────

function TitleCardScreen({ data, monthTitle }: { data: MonthInReviewData; monthTitle?: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mb-8 border border-purple-500/30">
        <Calendar size={20} className="text-purple-300" />
        <span className="text-purple-200 font-medium">{data.monthLabel}</span>
      </motion.div>
      <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
        className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-4">
        Monthly Recap
      </motion.h1>
      {monthTitle && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="mb-6">
          <span className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-500/10 rounded-full border border-cyan-500/20">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300 italic">{monthTitle}</span>
          </span>
        </motion.div>
      )}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="text-lg text-white/50">
        {data.totalHours.toFixed(1)}h across {data.uniqueGames} game{data.uniqueGames !== 1 ? 's' : ''} in {data.daysActive} days
      </motion.p>
    </div>
  );
}

function MonthInNumbersScreen({ data }: { data: MonthInReviewData }) {
  const stats = [
    { label: 'Hours Played', value: `${data.totalHours.toFixed(1)}h`, icon: <Clock size={20} />, color: 'text-blue-400' },
    { label: 'Sessions', value: `${data.totalSessions}`, icon: <Gamepad2 size={20} />, color: 'text-purple-400' },
    { label: 'Games', value: `${data.uniqueGames}`, icon: <BarChart3 size={20} />, color: 'text-cyan-400' },
    { label: 'Days Active', value: `${data.daysActive}`, icon: <Zap size={20} />, color: 'text-yellow-400' },
    { label: 'Spent', value: `$${data.totalSpent.toFixed(0)}`, icon: <DollarSign size={20} />, color: 'text-emerald-400' },
    { label: 'Completed', value: `${data.completedGames.length}`, icon: <Trophy size={20} />, color: 'text-orange-400' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">
        Month in Numbers
      </motion.h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-4 bg-white/[0.03] rounded-xl border border-white/5"
          >
            <span className={stat.color}>{stat.icon}</span>
            <div className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Top3Screen({ data }: { data: MonthInReviewData }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">
        Top Games
      </motion.h2>
      <div className="space-y-4">
        {data.top3Games.map((g, i) => (
          <motion.div
            key={g.game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.2 }}
            className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/5"
          >
            <span className="text-3xl">{medals[i]}</span>
            {g.game.thumbnail && (
              <img src={g.game.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 text-left">
              <div className="text-white font-semibold">{g.game.name}</div>
              <div className="text-xs text-white/40">{g.game.genre || 'Unknown'}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-400">{g.hours.toFixed(1)}h</div>
              <div className="text-xs text-white/30">{g.percentage.toFixed(0)}%</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GameOfTheMonthScreen({ data }: { data: MonthInReviewData }) {
  if (!data.topGame) return null;
  const { game, hours, sessions, percentage } = data.topGame;
  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-4">
        <Award size={40} className="text-yellow-400 mx-auto" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-yellow-400/60 mb-2">Game of the Month</motion.h2>
      {game.thumbnail && (
        <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          src={game.thumbnail} alt="" className="w-32 h-32 rounded-2xl object-cover mx-auto mb-4 border-2 border-yellow-500/30" />
      )}
      <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-2">{game.name}</motion.h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="flex justify-center gap-6 text-sm">
        <div><span className="text-2xl font-bold text-purple-400">{hours.toFixed(1)}h</span><div className="text-white/40 text-xs">played</div></div>
        <div><span className="text-2xl font-bold text-blue-400">{sessions}</span><div className="text-white/40 text-xs">sessions</div></div>
        <div><span className="text-2xl font-bold text-cyan-400">{percentage.toFixed(0)}%</span><div className="text-white/40 text-xs">of time</div></div>
        <div><span className="text-2xl font-bold text-yellow-400">{game.rating}/10</span><div className="text-white/40 text-xs">rating</div></div>
      </motion.div>
    </div>
  );
}

function ActivityCalendarScreen({ data }: { data: MonthInReviewData }) {
  const maxHours = Math.max(...data.dailyHours.map(d => d.hours), 1);
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const firstDayOfWeek = new Date(data.year, data.month - 1, 1).getDay();

  // Build calendar grid
  const cells: Array<{ day: number; hours: number } | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = data.dailyHours.find(dh => dh.date === dateStr);
    cells.push({ day: d, hours: entry?.hours || 0 });
  }

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">
        Activity Calendar
      </motion.h2>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-white/30 text-center py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.02 }}
            className="aspect-square rounded-md flex items-center justify-center text-[10px]"
            style={{
              backgroundColor: cell
                ? cell.hours > 0
                  ? `rgba(139, 92, 246, ${0.2 + (cell.hours / maxHours) * 0.8})`
                  : 'rgba(255,255,255,0.03)'
                : 'transparent',
            }}
          >
            {cell && <span className={cell.hours > 0 ? 'text-white/90 font-medium' : 'text-white/20'}>{cell.day}</span>}
          </motion.div>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        className="text-sm text-white/40">
        {data.daysActive} active days out of {daysInMonth}
      </motion.p>
    </div>
  );
}

function WeekByWeekScreen({ data }: { data: MonthInReviewData }) {
  const maxHours = Math.max(...data.weeklyHours.map(w => w.hours), 1);
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">
        Week by Week
      </motion.h2>
      <div className="space-y-3">
        {data.weeklyHours.map((w, i) => (
          <motion.div key={w.weekNum} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 w-16 text-right">Week {w.weekNum}</span>
              <div className="flex-1 h-8 bg-white/[0.03] rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(w.hours / maxHours) * 100}%` }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-end px-2"
                >
                  <span className="text-xs font-bold text-white">{w.hours.toFixed(1)}h</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GenreScreen({ data }: { data: MonthInReviewData }) {
  const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#6366f1'];
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">
        Genre Breakdown
      </motion.h2>
      <div className="space-y-3">
        {data.genreBreakdown.slice(0, 6).map((g, i) => (
          <motion.div key={g.genre} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-sm text-white/70 flex-1 text-left">{g.genre}</span>
            <span className="text-sm font-bold" style={{ color: colors[i % colors.length] }}>{g.percentage.toFixed(0)}%</span>
            <span className="text-xs text-white/30 w-14 text-right">{g.hours.toFixed(1)}h</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SpendingScreen({ data }: { data: MonthInReviewData }) {
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-4">
        <DollarSign size={40} className="text-emerald-400 mx-auto" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Spending Report</motion.h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-5xl font-black text-emerald-400 mb-6">${data.totalSpent.toFixed(0)}</motion.div>
      <div className="space-y-2">
        {data.gamesPurchased.slice(0, 5).map((g, i) => (
          <motion.div key={g.game.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-center justify-between text-sm px-4 py-2 bg-white/[0.03] rounded-lg">
            <span className="text-white/70">{g.game.name}</span>
            <span className="text-emerald-400 font-medium">${g.price.toFixed(0)}</span>
          </motion.div>
        ))}
      </div>
      {data.bestDeal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-4 text-xs text-white/40">
          Best deal: <span className="text-emerald-400">{data.bestDeal.game.name}</span> at ${data.bestDeal.costPerHour.toFixed(2)}/hr
        </motion.div>
      )}
    </div>
  );
}

function CompletionsScreen({ data }: { data: MonthInReviewData }) {
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-4">
        <Trophy size={40} className="text-yellow-400 mx-auto" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Completions & Starts</motion.h2>
      {data.completedGames.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-emerald-400 font-medium mb-2">Completed</div>
          {data.completedGames.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg mb-2">
              {g.thumbnail && <img src={g.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <span className="text-white font-medium">{g.name}</span>
              <span className="text-xs text-emerald-400 ml-auto">{g.rating}/10</span>
            </motion.div>
          ))}
        </div>
      )}
      {data.newGamesStarted.length > 0 && (
        <div>
          <div className="text-xs text-blue-400 font-medium mb-2">Started</div>
          {data.newGamesStarted.slice(0, 5).map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg mb-2">
              {g.thumbnail && <img src={g.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <span className="text-white font-medium">{g.name}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function BestValueScreen({ data }: { data: MonthInReviewData }) {
  if (!data.bestValueGame) return null;
  const { game, costPerHour } = data.bestValueGame;
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-4">
        <Star size={40} className="text-emerald-400 mx-auto" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Best Value This Month</motion.h2>
      {game.thumbnail && (
        <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          src={game.thumbnail} alt="" className="w-24 h-24 rounded-xl object-cover mx-auto mb-4" />
      )}
      <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-2xl font-bold text-white mb-2">{game.name}</motion.h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-4xl font-black text-emerald-400">${costPerHour.toFixed(2)}<span className="text-lg text-white/40">/hr</span></motion.div>
    </div>
  );
}

function VsLastMonthScreen({ data }: { data: MonthInReviewData }) {
  const items = [
    { label: 'Hours', diff: data.vsLastMonth.hoursDiff, format: (v: number) => `${Math.abs(v).toFixed(1)}h` },
    { label: 'Sessions', diff: data.vsLastMonth.sessionsDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Games', diff: data.vsLastMonth.gamesDiff, format: (v: number) => `${Math.abs(Math.round(v))}` },
    { label: 'Spending', diff: data.vsLastMonth.spendingDiff, format: (v: number) => `$${Math.abs(v).toFixed(0)}` },
  ];

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-8">vs Last Month</motion.h2>
      <div className="space-y-4">
        {items.map((item, i) => {
          const isUp = item.diff > 0;
          const isDown = item.diff < 0;
          return (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <span className="text-sm text-white/60">{item.label}</span>
              <div className="flex items-center gap-2">
                {isUp && <TrendingUp size={16} className="text-emerald-400" />}
                {isDown && <TrendingDown size={16} className="text-red-400" />}
                {!isUp && !isDown && <Minus size={16} className="text-white/30" />}
                <span className={`font-bold ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/40'}`}>
                  {isUp ? '+' : isDown ? '-' : ''}{item.format(item.diff)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BiggestDayScreen({ data }: { data: MonthInReviewData }) {
  if (!data.biggestDay) return null;
  const date = new Date(data.biggestDay.date);
  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-4">
        <Flame size={40} className="text-orange-400 mx-auto" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Biggest Gaming Day</motion.h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-lg text-white/60 mb-4">{dayLabel}</motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
        className="text-6xl font-black text-orange-400 mb-4">{data.biggestDay.hours.toFixed(1)}h</motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-sm text-white/40">
        {data.biggestDay.games.join(', ')}
      </motion.div>
    </div>
  );
}

function PersonalityScreen({ data }: { data: MonthInReviewData }) {
  const top = data.personality[0];
  if (!top) return null;
  const emojis: Record<string, string> = {
    Completionist: '🏆', 'Deep Diver': '🤿', Sampler: '🎲', 'Backlog Hoarder': '📦',
    'Balanced Gamer': '⚖️', Speedrunner: '⚡', Explorer: '🧭',
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">This Month&apos;s Personality</motion.h2>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-6xl mb-4">{emojis[top.type] || '🎮'}</motion.div>
      <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-2">{top.type}</motion.h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="w-48 mx-auto bg-white/10 rounded-full h-3 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${top.score}%` }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="text-sm text-white/40 mt-2">{top.score}% match</motion.p>
    </div>
  );
}

function ClosingScreen({ data, monthTitle }: { data: MonthInReviewData; monthTitle?: string }) {
  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-5xl mb-6">🎮</motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-white mb-4">That&apos;s a wrap!</motion.h2>
        {monthTitle && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-lg text-cyan-400 italic mb-4">{monthTitle}</motion.p>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex justify-center gap-8 text-sm mb-6">
          <div><span className="text-2xl font-bold text-purple-400">{data.totalHours.toFixed(1)}h</span><div className="text-white/40 text-xs">played</div></div>
          <div><span className="text-2xl font-bold text-blue-400">{data.uniqueGames}</span><div className="text-white/40 text-xs">games</div></div>
          <div><span className="text-2xl font-bold text-cyan-400">{data.totalSessions}</span><div className="text-white/40 text-xs">sessions</div></div>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-sm text-white/40">See you next month!</motion.p>
      </motion.div>
    </div>
  );
}
