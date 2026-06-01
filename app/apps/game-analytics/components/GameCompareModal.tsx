'use client';

import { useState, useMemo } from 'react';
import {
  X, Search, Swords, Trophy, Clock, DollarSign, Star,
  TrendingUp, Hash, ChevronRight, ArrowLeftRight,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getValueRating } from '../lib/calculations';
import { RatingStars } from './RatingStars';
import clsx from 'clsx';

interface GameCompareModalProps {
  gameA: GameWithMetrics;
  allGames: GameWithMetrics[];
  onClose: () => void;
}

// Invert cost-per-hour into a 0-100 "value score" ($0/hr = 100, $10+/hr = 0)
function valueScore(cph: number): number {
  if (cph === 0) return 0; // unplayed / free
  return Math.max(0, Math.min(100, Math.round((1 - Math.min(cph, 10) / 10) * 100)));
}

type StatResult = {
  label: string;
  icon: React.ReactNode;
  aRaw: string;
  bRaw: string;
  aPct: number;  // 0-100, used for bar width
  bPct: number;
  winner: 'A' | 'B' | 'tie';
  higherIsBetter: boolean;
  category: string;
};

function buildStats(a: GameWithMetrics, b: GameWithMetrics): StatResult[] {
  const hoursA = a.totalHours;
  const hoursB = b.totalHours;
  const maxHours = Math.max(hoursA, hoursB, 1);

  const sessionsA = a.playLogs?.length ?? 0;
  const sessionsB = b.playLogs?.length ?? 0;
  const maxSessions = Math.max(sessionsA, sessionsB, 1);

  const roiA = a.metrics.roi;
  const roiB = b.metrics.roi;
  const maxROI = Math.max(roiA, roiB, 0.1);

  const cphA = a.metrics.costPerHour;
  const cphB = b.metrics.costPerHour;
  // For cost, lower is better — invert for bar (lower cost → higher bar)
  const maxCPH = Math.max(cphA, cphB, 0.1);

  function winnerOf(vA: number, vB: number, higherIsBetter: boolean): 'A' | 'B' | 'tie' {
    const EPSILON = 0.001;
    if (Math.abs(vA - vB) < EPSILON) return 'tie';
    if (higherIsBetter) return vA > vB ? 'A' : 'B';
    return vA < vB ? 'A' : 'B';
  }

  return [
    {
      label: 'Rating',
      icon: <Star size={13} />,
      aRaw: a.rating > 0 ? `${a.rating}/10` : '—',
      bRaw: b.rating > 0 ? `${b.rating}/10` : '—',
      aPct: (a.rating / 10) * 100,
      bPct: (b.rating / 10) * 100,
      winner: a.rating === 0 && b.rating === 0 ? 'tie' : winnerOf(a.rating, b.rating, true),
      higherIsBetter: true,
      category: 'rating',
    },
    {
      label: 'Total Hours',
      icon: <Clock size={13} />,
      aRaw: hoursA > 0 ? `${hoursA.toFixed(1)}h` : '—',
      bRaw: hoursB > 0 ? `${hoursB.toFixed(1)}h` : '—',
      aPct: (hoursA / maxHours) * 100,
      bPct: (hoursB / maxHours) * 100,
      winner: hoursA === 0 && hoursB === 0 ? 'tie' : winnerOf(hoursA, hoursB, true),
      higherIsBetter: true,
      category: 'hours',
    },
    {
      label: 'Cost / Hour',
      icon: <DollarSign size={13} />,
      aRaw: cphA > 0 ? `$${cphA.toFixed(2)}/hr` : '—',
      bRaw: cphB > 0 ? `$${cphB.toFixed(2)}/hr` : '—',
      // For bar: invert so lower cost = longer bar
      aPct: cphA > 0 ? ((maxCPH - cphA) / maxCPH) * 100 : 0,
      bPct: cphB > 0 ? ((maxCPH - cphB) / maxCPH) * 100 : 0,
      winner: cphA === 0 && cphB === 0 ? 'tie' : (cphA === 0 ? 'B' : cphB === 0 ? 'A' : winnerOf(cphA, cphB, false)),
      higherIsBetter: false,
      category: 'value',
    },
    {
      label: 'ROI Score',
      icon: <TrendingUp size={13} />,
      aRaw: roiA > 0 ? roiA.toFixed(1) : '—',
      bRaw: roiB > 0 ? roiB.toFixed(1) : '—',
      aPct: (roiA / maxROI) * 100,
      bPct: (roiB / maxROI) * 100,
      winner: roiA === 0 && roiB === 0 ? 'tie' : winnerOf(roiA, roiB, true),
      higherIsBetter: true,
      category: 'roi',
    },
    {
      label: 'Sessions',
      icon: <Hash size={13} />,
      aRaw: sessionsA > 0 ? String(sessionsA) : '—',
      bRaw: sessionsB > 0 ? String(sessionsB) : '—',
      aPct: (sessionsA / maxSessions) * 100,
      bPct: (sessionsB / maxSessions) * 100,
      winner: sessionsA === 0 && sessionsB === 0 ? 'tie' : winnerOf(sessionsA, sessionsB, true),
      higherIsBetter: true,
      category: 'sessions',
    },
  ];
}

function buildRadarData(a: GameWithMetrics, b: GameWithMetrics) {
  const hoursA = a.totalHours;
  const hoursB = b.totalHours;
  const maxHours = Math.max(hoursA, hoursB, 1);
  const sessionsA = a.playLogs?.length ?? 0;
  const sessionsB = b.playLogs?.length ?? 0;
  const maxSessions = Math.max(sessionsA, sessionsB, 1);
  const maxROI = Math.max(a.metrics.roi, b.metrics.roi, 0.1);

  return [
    {
      axis: 'Rating',
      A: Math.round((a.rating / 10) * 100),
      B: Math.round((b.rating / 10) * 100),
    },
    {
      axis: 'Value',
      A: a.metrics.costPerHour > 0 ? valueScore(a.metrics.costPerHour) : 0,
      B: b.metrics.costPerHour > 0 ? valueScore(b.metrics.costPerHour) : 0,
    },
    {
      axis: 'Hours',
      A: Math.round((hoursA / maxHours) * 100),
      B: Math.round((hoursB / maxHours) * 100),
    },
    {
      axis: 'ROI',
      A: Math.min(100, Math.round((a.metrics.roi / Math.max(maxROI, 10)) * 100)),
      B: Math.min(100, Math.round((b.metrics.roi / Math.max(maxROI, 10)) * 100)),
    },
    {
      axis: 'Sessions',
      A: Math.round((sessionsA / maxSessions) * 100),
      B: Math.round((sessionsB / maxSessions) * 100),
    },
  ];
}

function GamePicker({
  query,
  onQueryChange,
  candidates,
  onSelect,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  candidates: GameWithMetrics[];
  onSelect: (g: GameWithMetrics) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-white/50 text-center mb-4">Pick a game to compare</p>
      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search games…"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-purple-500/40 transition-colors"
        />
      </div>
      {/* Game list */}
      <div className="overflow-y-auto flex-1 space-y-1 overscroll-contain">
        {candidates.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">No games found</p>
        )}
        {candidates.map(g => (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all text-left"
          >
            {g.thumbnail ? (
              <img src={g.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                <Star size={14} className="text-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/85 truncate">{g.name}</p>
              <p className="text-xs text-white/35 truncate">
                {g.genre || g.platform || g.status}
                {g.rating > 0 && ` · ${g.rating}/10`}
                {g.totalHours > 0 && ` · ${g.totalHours.toFixed(0)}h`}
              </p>
            </div>
            <ChevronRight size={14} className="text-white/20 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function StatBar({ stat, nameA, nameB }: { stat: StatResult; nameA: string; nameB: string }) {
  const aWins = stat.winner === 'A';
  const bWins = stat.winner === 'B';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-white/40">
        {stat.icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{stat.label}</span>
        {!stat.higherIsBetter && <span className="text-[10px] text-white/25">(lower is better)</span>}
      </div>

      {/* A bar */}
      <div className="flex items-center gap-2">
        <span className={clsx(
          'text-xs font-semibold w-16 text-right shrink-0 truncate',
          aWins ? 'text-emerald-400' : 'text-white/60'
        )}>
          {stat.aRaw}
        </span>
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              aWins ? 'bg-purple-500' : 'bg-white/15'
            )}
            style={{ width: `${Math.max(stat.aPct, 2)}%` }}
          />
        </div>
        {aWins && <Trophy size={11} className="text-emerald-400 shrink-0" />}
        {!aWins && <span className="w-[11px] shrink-0" />}
      </div>

      {/* B bar */}
      <div className="flex items-center gap-2">
        <span className={clsx(
          'text-xs font-semibold w-16 text-right shrink-0 truncate',
          bWins ? 'text-emerald-400' : 'text-white/60'
        )}>
          {stat.bRaw}
        </span>
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              bWins ? 'bg-blue-500' : 'bg-white/15'
            )}
            style={{ width: `${Math.max(stat.bPct, 2)}%` }}
          />
        </div>
        {bWins && <Trophy size={11} className="text-emerald-400 shrink-0" />}
        {!bWins && <span className="w-[11px] shrink-0" />}
      </div>
    </div>
  );
}

export function GameCompareModal({ gameA: initialA, allGames, onClose }: GameCompareModalProps) {
  const [gameA, setGameA] = useState<GameWithMetrics>(initialA);
  const [gameB, setGameB] = useState<GameWithMetrics | null>(null);
  const [query, setQuery] = useState('');

  const candidates = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allGames
      .filter(g => g.id !== gameA.id && g.status !== 'Wishlist')
      .filter(g =>
        !q
        || g.name.toLowerCase().includes(q)
        || (g.genre || '').toLowerCase().includes(q)
        || (g.platform || '').toLowerCase().includes(q)
        || (g.franchise || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [allGames, gameA.id, query]);

  const stats = useMemo(
    () => (gameB ? buildStats(gameA, gameB) : []),
    [gameA, gameB]
  );

  const radarData = useMemo(
    () => (gameB ? buildRadarData(gameA, gameB) : []),
    [gameA, gameB]
  );

  const winsA = stats.filter(s => s.winner === 'A').length;
  const winsB = stats.filter(s => s.winner === 'B').length;
  const overallWinner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'tie';

  const handleSwap = () => {
    if (!gameB) return;
    setGameA(gameB);
    setGameB(gameA);
  };

  const valueRatingA = getValueRating(gameA.metrics.costPerHour);
  const valueRatingB = gameB ? getValueRating(gameB.metrics.costPerHour) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-[#0e0e16] rounded-t-2xl max-h-[92dvh] overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center px-5 pb-3 pt-1 shrink-0 gap-3">
          <Swords size={18} className="text-purple-400 shrink-0" />
          <h2 className="text-base font-bold text-white/90 flex-1">Compare Games</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 active:bg-white/10 text-white/40 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* VS Header — shown when gameB is selected */}
        {gameB && (
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-2xl p-3 border border-white/5">
              {/* Game A */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {gameA.thumbnail ? (
                  <img src={gameA.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-purple-500/30" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 shrink-0 flex items-center justify-center border border-purple-500/20">
                    <Star size={14} className="text-purple-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-purple-400 truncate">{gameA.name}</p>
                  <RatingStars rating={gameA.rating} size={10} />
                </div>
              </div>

              {/* VS + swap */}
              <div className="flex flex-col items-center gap-1 shrink-0 px-1">
                <span className="text-[11px] font-black text-white/40 tracking-widest">VS</span>
                <button
                  onClick={handleSwap}
                  className="p-1 rounded-lg bg-white/5 active:bg-white/10 text-white/30 transition-all"
                  title="Swap games"
                >
                  <ArrowLeftRight size={12} />
                </button>
              </div>

              {/* Game B */}
              <div className="flex-1 flex items-center gap-2 min-w-0 flex-row-reverse">
                {gameB.thumbnail ? (
                  <img src={gameB.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-blue-500/30" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 shrink-0 flex items-center justify-center border border-blue-500/20">
                    <Star size={14} className="text-blue-400" />
                  </div>
                )}
                <div className="min-w-0 text-right">
                  <p className="text-[11px] font-bold text-blue-400 truncate">{gameB.name}</p>
                  <div className="flex justify-end">
                    <RatingStars rating={gameB.rating} size={10} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 min-h-0">
          {!gameB ? (
            <GamePicker
              query={query}
              onQueryChange={setQuery}
              candidates={candidates}
              onSelect={setGameB}
            />
          ) : (
            <div className="space-y-5">
              {/* Radar chart */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Radar Comparison</p>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500/70" />
                    <span className="text-xs text-white/50 truncate max-w-[80px]">{gameA.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500/70" />
                    <span className="text-xs text-white/50 truncate max-w-[80px]">{gameB.name}</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                    />
                    <Radar
                      name={gameA.name}
                      dataKey="A"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 3 }}
                    />
                    <Radar
                      name={gameB.name}
                      dataKey="B"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Stat rows */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4 space-y-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Head-to-Head</p>

                {/* Name labels */}
                <div className="flex items-center">
                  <div className="w-16 shrink-0" /> {/* spacer for value column */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="flex-1 text-center text-[10px] font-bold text-purple-400 truncate px-1 hidden">A</span>
                  </div>
                  <div className="w-[11px] shrink-0" />
                </div>

                {stats.map(stat => (
                  <StatBar
                    key={stat.category}
                    stat={stat}
                    nameA={gameA.name}
                    nameB={gameB.name}
                  />
                ))}

                {/* Value Rating rows */}
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Star size={13} className="text-yellow-400/60" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Value Rating</span>
                  </div>
                  <div className="flex items-center justify-around gap-3">
                    <div className={clsx(
                      'flex-1 text-center py-2 rounded-xl text-xs font-bold',
                      valueRatingA === 'Excellent' ? 'bg-emerald-500/15 text-emerald-400' :
                      valueRatingA === 'Good' ? 'bg-blue-500/15 text-blue-400' :
                      valueRatingA === 'Fair' ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
                    )}>
                      {valueRatingA}
                    </div>
                    <span className="text-white/20 text-xs">vs</span>
                    <div className={clsx(
                      'flex-1 text-center py-2 rounded-xl text-xs font-bold',
                      valueRatingB === 'Excellent' ? 'bg-emerald-500/15 text-emerald-400' :
                      valueRatingB === 'Good' ? 'bg-blue-500/15 text-blue-400' :
                      valueRatingB === 'Fair' ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
                    )}>
                      {valueRatingB}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className={clsx(
                'rounded-2xl border p-4 text-center',
                overallWinner === 'A'
                  ? 'bg-purple-500/10 border-purple-500/20'
                  : overallWinner === 'B'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-white/[0.03] border-white/10'
              )}>
                <Trophy size={24} className={clsx(
                  'mx-auto mb-2',
                  overallWinner === 'A' ? 'text-purple-400' :
                  overallWinner === 'B' ? 'text-blue-400' :
                  'text-white/30'
                )} />

                {overallWinner === 'tie' ? (
                  <>
                    <p className="text-sm font-bold text-white/70">It&apos;s a tie!</p>
                    <p className="text-xs text-white/40 mt-1">Both games are evenly matched</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-white/50 mb-1">Overall winner</p>
                    <p className={clsx(
                      'text-base font-bold truncate px-4',
                      overallWinner === 'A' ? 'text-purple-400' : 'text-blue-400'
                    )}>
                      {overallWinner === 'A' ? gameA.name : gameB.name}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {Math.max(winsA, winsB)} of {stats.length} categories
                    </p>
                  </>
                )}

                {/* Score dots */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-2xl font-black text-purple-400">{winsA}</span>
                  <span className="text-white/20 text-sm">—</span>
                  <span className="text-2xl font-black text-blue-400">{winsB}</span>
                </div>
                <div className="flex items-center justify-center gap-3 mt-0.5">
                  <span className="text-[10px] text-purple-400/60 font-medium truncate max-w-[80px]">{gameA.name}</span>
                  <span className="w-[16px]" />
                  <span className="text-[10px] text-blue-400/60 font-medium truncate max-w-[80px]">{gameB.name}</span>
                </div>
              </div>

              {/* Change game B button */}
              <button
                onClick={() => { setGameB(null); setQuery(''); }}
                className="w-full py-3 rounded-xl bg-white/5 active:bg-white/10 text-white/40 text-sm transition-all"
              >
                Compare with a different game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
