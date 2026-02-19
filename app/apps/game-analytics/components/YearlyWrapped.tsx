'use client';

import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Trophy, Clock, DollarSign, Gamepad2, Star, TrendingUp, Zap, Calendar } from 'lucide-react';
import { Game } from '../lib/types';
import { getYearlyWrappedData, YearlyWrappedData } from '../lib/calculations';
import clsx from 'clsx';

interface YearlyWrappedProps {
  games: Game[];
  year: number;
  onClose: () => void;
}

// Individual screen components
function TitleScreen({ data }: { data: YearlyWrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-6xl font-black text-white/90 mb-4">{data.year}</div>
      <div className="text-xl text-purple-400 font-medium mb-2">Your Gaming Year</div>
      <div className="text-sm text-white/30">Swipe to explore your journey</div>
    </div>
  );
}

function NumbersScreen({ data }: { data: YearlyWrappedData }) {
  const stats = [
    { label: 'Hours Played', value: `${data.totalHours}h`, icon: <Clock size={20} className="text-purple-400" /> },
    { label: 'Play Sessions', value: data.totalSessions.toString(), icon: <Gamepad2 size={20} className="text-blue-400" /> },
    { label: 'Games Acquired', value: data.gamesAcquired.toString(), icon: <TrendingUp size={20} className="text-emerald-400" /> },
    { label: 'Games Completed', value: data.gamesCompleted.toString(), icon: <Trophy size={20} className="text-yellow-400" /> },
    { label: 'Total Spent', value: `$${data.totalSpent}`, icon: <DollarSign size={20} className="text-emerald-400" /> },
    { label: 'Avg $/Hour', value: `$${data.avgCostPerHour}`, icon: <Zap size={20} className="text-orange-400" /> },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h2 className="text-lg font-bold text-white/70 mb-6">{data.year} in Numbers</h2>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {stats.map((stat, i) => (
          <div key={i} className="p-4 bg-white/[0.03] rounded-xl border border-white/5 text-center">
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-white/90">{stat.value}</div>
            <div className="text-[10px] text-white/30 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Top10Screen({ data }: { data: YearlyWrappedData }) {
  return (
    <div className="flex flex-col h-full px-6 py-8">
      <h2 className="text-lg font-bold text-white/70 mb-4 text-center">Top 10 Games</h2>
      <div className="flex-1 overflow-y-auto space-y-2">
        {data.top10Games.map((game, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
              i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
              i === 1 ? 'bg-gray-400/20 text-gray-300' :
              i === 2 ? 'bg-orange-500/20 text-orange-400' :
              'bg-white/5 text-white/30'
            )}>
              {i + 1}
            </div>
            {game.thumbnail ? (
              <img src={game.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 font-medium truncate">{game.name}</div>
              <div className="text-[10px] text-white/30">{game.rating}/10</div>
            </div>
            <div className="text-sm font-mono text-white/50">{game.hours}h</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameOfYearScreen({ data }: { data: YearlyWrappedData }) {
  if (!data.gameOfTheYear) return null;
  const game = data.gameOfTheYear;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-xs text-yellow-400/60 uppercase tracking-widest mb-4">Game of the Year</div>
      {game.thumbnail ? (
        <img src={game.thumbnail} alt="" className="w-32 h-32 rounded-2xl object-cover mb-6 shadow-2xl" loading="lazy" />
      ) : (
        <div className="w-32 h-32 rounded-2xl bg-white/5 mb-6" />
      )}
      <div className="text-2xl font-black text-white/90 mb-2">{game.name}</div>
      <div className="flex items-center gap-4 text-sm text-white/50">
        <span>{game.hours}h played</span>
        <span>{game.rating}/10</span>
      </div>
    </div>
  );
}

function GenreScreen({ data }: { data: YearlyWrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h2 className="text-lg font-bold text-white/70 mb-6">Genre Breakdown</h2>
      <div className="w-full max-w-sm space-y-3">
        {data.genreBreakdown.slice(0, 6).map((genre, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-20 text-right truncate">{genre.genre}</span>
            <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500/40 transition-all duration-500"
                style={{ width: `${genre.percent}%` }}
              />
            </div>
            <span className="text-xs text-white/50 w-16">{genre.hours}h ({genre.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyScreen({ data }: { data: YearlyWrappedData }) {
  const maxHours = Math.max(...data.monthlyHours.map(m => m.hours), 1);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h2 className="text-lg font-bold text-white/70 mb-2">Monthly Rhythm</h2>
      {data.peakMonth && (
        <p className="text-xs text-white/30 mb-6">Peak: {data.peakMonth.label} ({data.peakMonth.hours}h)</p>
      )}
      <div className="flex items-end gap-1.5 h-40 w-full max-w-sm">
        {data.monthlyHours.map((month, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={clsx(
                'w-full rounded-t transition-all',
                month.hours > 0 ? 'bg-purple-500/40' : 'bg-white/5',
                data.peakMonth?.month === month.month && 'bg-purple-500/70',
              )}
              style={{ height: `${(month.hours / maxHours) * 100}%`, minHeight: month.hours > 0 ? 4 : 2 }}
            />
            <span className="text-[8px] text-white/20">{month.label.substring(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuperlativesScreen({ data }: { data: YearlyWrappedData }) {
  const items = [
    data.fastestCompletion && { label: 'Fastest Completion', value: `${data.fastestCompletion.name} (${data.fastestCompletion.days} days)` },
    data.longestSession && { label: 'Longest Session', value: `${data.longestSession.name} (${data.longestSession.hours}h)` },
    data.biggestSurprise && { label: 'Biggest Surprise', value: `${data.biggestSurprise.name} — ${data.biggestSurprise.reason}` },
    data.bestValue && { label: 'Best Value', value: `${data.bestValue.name} ($${data.bestValue.costPerHour}/hr)` },
    data.worstValue && { label: 'Worst Value', value: `${data.worstValue.name} ($${data.worstValue.costPerHour}/hr)` },
  ].filter(Boolean);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h2 className="text-lg font-bold text-white/70 mb-6">Superlatives</h2>
      <div className="w-full max-w-sm space-y-3">
        {items.map((item, i) => (
          <div key={i} className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{item!.label}</div>
            <div className="text-sm text-white/70">{item!.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonalityScreen({ data }: { data: YearlyWrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-xs text-purple-400/60 uppercase tracking-widest mb-4">Your Gaming Personality</div>
      <div className="text-4xl font-black text-white/90 mb-4">{data.personalityType}</div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-xs text-white/40">
        <div className="p-2 bg-white/[0.03] rounded-lg">
          <div className="text-white/60 font-medium">{data.hoursPerWeek}h/week</div>
          <div>Average pace</div>
        </div>
        <div className="p-2 bg-white/[0.03] rounded-lg">
          <div className="text-white/60 font-medium">{data.completionRate}%</div>
          <div>Completion rate</div>
        </div>
      </div>
    </div>
  );
}

function ClosingScreen({ data }: { data: YearlyWrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-4xl font-black text-white/90 mb-3">{data.year}</div>
      <div className="text-sm text-white/40 mb-6">What a year of gaming.</div>
      <div className="flex items-center gap-6 text-xs text-white/30">
        <div><span className="text-white/60 font-medium">{data.totalHours}h</span> played</div>
        <div><span className="text-white/60 font-medium">{data.gamesCompleted}</span> completed</div>
        <div><span className="text-white/60 font-medium">${data.totalSpent}</span> spent</div>
      </div>
      <div className="mt-8 text-sm text-purple-400/60">See you in {data.year + 1}</div>
    </div>
  );
}

export function YearlyWrapped({ games, year, onClose }: YearlyWrappedProps) {
  const data = useMemo(() => getYearlyWrappedData(games, year), [games, year]);
  const [screenIndex, setScreenIndex] = useState(0);

  const screens = useMemo(() => {
    const s: { id: string; component: React.ReactNode }[] = [
      { id: 'title', component: <TitleScreen data={data} /> },
      { id: 'numbers', component: <NumbersScreen data={data} /> },
    ];
    if (data.top10Games.length > 0) {
      s.push({ id: 'top10', component: <Top10Screen data={data} /> });
    }
    if (data.gameOfTheYear) {
      s.push({ id: 'goty', component: <GameOfYearScreen data={data} /> });
    }
    if (data.genreBreakdown.length > 0) {
      s.push({ id: 'genre', component: <GenreScreen data={data} /> });
    }
    s.push({ id: 'monthly', component: <MonthlyScreen data={data} /> });
    s.push({ id: 'superlatives', component: <SuperlativesScreen data={data} /> });
    s.push({ id: 'personality', component: <PersonalityScreen data={data} /> });
    s.push({ id: 'closing', component: <ClosingScreen data={data} /> });
    return s;
  }, [data]);

  const goNext = () => setScreenIndex(prev => Math.min(prev + 1, screens.length - 1));
  const goPrev = () => setScreenIndex(prev => Math.max(prev - 1, 0));

  if (!data.hasData) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
        <div className="text-center text-white/40">
          <p className="text-lg mb-2">No gaming data for {year}</p>
          <p className="text-sm">Start logging sessions to build your yearly wrapped!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0a15] via-[#10101f] to-[#0d0d1a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {/* Progress dots */}
        <div className="flex gap-1">
          {screens.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'h-1 rounded-full transition-all',
                i === screenIndex ? 'w-6 bg-purple-400' : 'w-1.5 bg-white/10',
                i < screenIndex && 'bg-purple-400/30',
              )}
            />
          ))}
        </div>
        <button onClick={onClose} className="p-2 text-white/30 hover:text-white/60 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Screen Content */}
      <div className="flex-1 overflow-hidden">
        {screens[screenIndex]?.component}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={goPrev}
          disabled={screenIndex === 0}
          className="p-2 text-white/30 hover:text-white/60 disabled:opacity-20 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-[10px] text-white/20 font-mono">
          {screenIndex + 1} / {screens.length}
        </span>
        {screenIndex < screens.length - 1 ? (
          <button
            onClick={goNext}
            className="p-2 text-white/30 hover:text-white/60 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-all"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
