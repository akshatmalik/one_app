'use client';

import { useState, useMemo } from 'react';
import {
  X, Trophy, Search, ArrowLeftRight, ChevronRight,
} from 'lucide-react';
import { Game } from '../lib/types';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getRelationshipStatus,
} from '../lib/calculations';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

interface Props {
  game1: GameWithMetrics;
  allGames: GameWithMetrics[];
  onClose: () => void;
}

// ── Radar normalisation helpers (0-100) ──────────────────────────────
function normRating(v: number) { return Math.round(v * 10); }
function normHours(h: number) { return Math.min(100, Math.round((h / 150) * 100)); }
function normValue(cph: number, hours: number) {
  if (hours === 0) return 0;
  if (cph <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - cph * 8)));
}
function normROI(roi: number) { return Math.min(100, Math.round(roi * 5)); }
function normSessions(n: number) { return Math.min(100, Math.round((n / 30) * 100)); }

// ── Stats comparison ─────────────────────────────────────────────────
interface StatRow {
  label: string;
  aDisplay: string;
  bDisplay: string;
  aNum: number;
  bNum: number;
  lowerBetter: boolean;
}

function buildStats(a: GameWithMetrics, b: GameWithMetrics): StatRow[] {
  const aH = a.totalHours;
  const bH = b.totalHours;
  const aSessions = a.playLogs?.length ?? 0;
  const bSessions = b.playLogs?.length ?? 0;
  const aCPH = aH > 0 && a.price > 0 ? a.metrics.costPerHour : aH > 0 ? 0 : -1;
  const bCPH = bH > 0 && b.price > 0 ? b.metrics.costPerHour : bH > 0 ? 0 : -1;

  return [
    {
      label: 'Price',
      aDisplay: a.acquiredFree ? 'Free' : a.price > 0 ? `$${a.price}` : '$0',
      bDisplay: b.acquiredFree ? 'Free' : b.price > 0 ? `$${b.price}` : '$0',
      aNum: a.acquiredFree ? 0 : a.price,
      bNum: b.acquiredFree ? 0 : b.price,
      lowerBetter: true,
    },
    {
      label: 'Hours Played',
      aDisplay: `${aH.toFixed(1)}h`,
      bDisplay: `${bH.toFixed(1)}h`,
      aNum: aH,
      bNum: bH,
      lowerBetter: false,
    },
    {
      label: 'Rating',
      aDisplay: a.rating > 0 ? `${a.rating}/10` : '—',
      bDisplay: b.rating > 0 ? `${b.rating}/10` : '—',
      aNum: a.rating,
      bNum: b.rating,
      lowerBetter: false,
    },
    {
      label: 'Cost / Hour',
      aDisplay: aCPH < 0 ? '—' : aCPH === 0 ? '$0/hr' : `$${aCPH.toFixed(2)}/hr`,
      bDisplay: bCPH < 0 ? '—' : bCPH === 0 ? '$0/hr' : `$${bCPH.toFixed(2)}/hr`,
      aNum: aCPH < 0 ? 9999 : aCPH,
      bNum: bCPH < 0 ? 9999 : bCPH,
      lowerBetter: true,
    },
    {
      label: 'ROI Score',
      aDisplay: a.price > 0 ? a.metrics.roi.toFixed(1) : '—',
      bDisplay: b.price > 0 ? b.metrics.roi.toFixed(1) : '—',
      aNum: a.price > 0 ? a.metrics.roi : -1,
      bNum: b.price > 0 ? b.metrics.roi : -1,
      lowerBetter: false,
    },
    {
      label: 'Sessions',
      aDisplay: aSessions > 0 ? String(aSessions) : '—',
      bDisplay: bSessions > 0 ? String(bSessions) : '—',
      aNum: aSessions,
      bNum: bSessions,
      lowerBetter: false,
    },
  ];
}

function rowWinner(row: StatRow): 'a' | 'b' | 'tie' {
  if (row.aNum < 0 && row.bNum < 0) return 'tie';
  if (row.aNum < 0) return 'b';
  if (row.bNum < 0) return 'a';
  if (row.aNum === row.bNum) return 'tie';
  if (row.lowerBetter) return row.aNum < row.bNum ? 'a' : 'b';
  return row.aNum > row.bNum ? 'a' : 'b';
}

// ── Radar chart data ─────────────────────────────────────────────────
function buildRadarData(a: GameWithMetrics, b: GameWithMetrics) {
  const aH = a.totalHours;
  const bH = b.totalHours;
  const aCPH = a.price > 0 && aH > 0 ? a.metrics.costPerHour : 0;
  const bCPH = b.price > 0 && bH > 0 ? b.metrics.costPerHour : 0;
  return [
    { axis: 'Rating', A: normRating(a.rating), B: normRating(b.rating) },
    { axis: 'Playtime', A: normHours(aH), B: normHours(bH) },
    { axis: 'Value', A: normValue(aCPH, aH), B: normValue(bCPH, bH) },
    { axis: 'ROI', A: a.price > 0 ? normROI(a.metrics.roi) : 0, B: b.price > 0 ? normROI(b.metrics.roi) : 0 },
    { axis: 'Sessions', A: normSessions(a.playLogs?.length ?? 0), B: normSessions(b.playLogs?.length ?? 0) },
  ];
}

// ── Game thumbnail helper ────────────────────────────────────────────
function Thumb({ game, size = 64 }: { game: GameWithMetrics; size?: number }) {
  return game.thumbnail
    ? <img src={game.thumbnail} alt={game.name} className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    : <div className="rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-xl"
        style={{ width: size, height: size }}>🎮</div>;
}

// ── Main component ───────────────────────────────────────────────────
export function GameCompareModal({ game1, allGames, onClose }: Props) {
  const [game2, setGame2] = useState<GameWithMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const candidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allGames
      .filter(g => g.id !== game1.id && g.status !== 'Wishlist')
      .filter(g => !q ||
        g.name.toLowerCase().includes(q) ||
        (g.genre?.toLowerCase().includes(q)) ||
        (g.platform?.toLowerCase().includes(q))
      )
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [allGames, game1.id, searchQuery]);

  const stats = useMemo(() => game2 ? buildStats(game1, game2) : [], [game1, game2]);
  const radarData = useMemo(() => game2 ? buildRadarData(game1, game2) : [], [game1, game2]);

  const { winsA, winsB, contested } = useMemo(() => {
    let a = 0, b = 0, total = 0;
    for (const row of stats) {
      const w = rowWinner(row);
      if (w !== 'tie') { total++; if (w === 'a') a++; else b++; }
    }
    return { winsA: a, winsB: b, contested: total };
  }, [stats]);

  const overall = winsA > winsB ? 'a' : winsB > winsA ? 'b' : 'tie';

  const rel1 = useMemo(
    () => getRelationshipStatus(game1 as Game, allGames as Game[]),
    [game1, allGames]
  );
  const rel2 = useMemo(
    () => game2 ? getRelationshipStatus(game2 as Game, allGames as Game[]) : null,
    [game2, allGames]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white">Head to Head</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* ── Game header row ── */}
        <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2 px-5 py-4 border-b border-white/5 shrink-0">
          {/* Game A — always game1 */}
          <div className="flex flex-col items-center text-center gap-2">
            <Thumb game={game1} size={60} />
            <div>
              <p className="text-xs font-semibold text-white/90 leading-tight line-clamp-2">{game1.name}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{game1.status}</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-sm font-black text-white/20">VS</span>
          </div>

          {/* Game B — pick state or selected */}
          {!game2 ? (
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-[60px] h-[60px] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                <Search size={18} className="text-white/20" />
              </div>
              <p className="text-[11px] text-white/30">↓ Pick a game</p>
            </div>
          ) : (
            <button
              onClick={() => setGame2(null)}
              className="flex flex-col items-center text-center gap-2 group"
            >
              <div className="relative">
                <Thumb game={game2} size={60} />
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <span className="text-[9px] text-white/0 group-hover:text-white/80 font-medium transition-all">change</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90 leading-tight line-clamp-2">{game2.name}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{game2.status}</p>
              </div>
            </button>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">

          {!game2 ? (
            /* ── Game picker ── */
            <div className="p-4">
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search your library…"
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {candidates.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-10">No other games to compare</p>
              ) : (
                <div className="space-y-0.5">
                  {candidates.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGame2(g)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/8 transition-all text-left"
                    >
                      <Thumb game={g} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white/90 truncate">{g.name}</p>
                        <p className="text-[10px] text-white/35">
                          {g.status} · {g.totalHours > 0 ? `${g.totalHours.toFixed(1)}h` : 'unplayed'}
                          {g.rating > 0 && ` · ${g.rating}/10`}
                        </p>
                      </div>
                      <ChevronRight size={13} className="text-white/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Comparison view ── */
            <div className="p-4 space-y-5 pb-8">

              {/* Winner banner */}
              {contested > 0 && (
                <div className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold',
                  overall === 'a' ? 'bg-purple-500/15 text-purple-300' :
                  overall === 'b' ? 'bg-blue-500/15 text-blue-300' :
                  'bg-white/5 text-white/40'
                )}>
                  {overall === 'tie' ? (
                    <>🤝 Dead heat</>
                  ) : (
                    <>
                      <Trophy size={14} />
                      {overall === 'a' ? game1.name : game2.name} wins {Math.max(winsA, winsB)}/{contested} categories
                    </>
                  )}
                </div>
              )}

              {/* Stats table */}
              <div className="rounded-xl overflow-hidden border border-white/5">
                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_1fr] bg-white/[0.025]">
                  <div className="w-28 px-3 py-2 text-[9px] text-white/25 font-bold uppercase tracking-wider">Stat</div>
                  <div className="px-3 py-2 text-[9px] text-purple-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {game1.name}
                  </div>
                  <div className="px-3 py-2 text-[9px] text-blue-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {game2.name}
                  </div>
                </div>

                {stats.map((row, i) => {
                  const winner = rowWinner(row);
                  return (
                    <div
                      key={row.label}
                      className={clsx('grid grid-cols-[auto_1fr_1fr] items-center', i > 0 && 'border-t border-white/5')}
                    >
                      <div className="w-28 px-3 py-2.5 text-xs text-white/35">{row.label}</div>
                      <div className={clsx(
                        'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                        winner === 'a' ? 'text-purple-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.aDisplay}
                        {winner === 'a' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                      <div className={clsx(
                        'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                        winner === 'b' ? 'text-blue-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.bDisplay}
                        {winner === 'b' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Radar chart */}
              <div>
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-3">Visual Profile</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 8, right: 36, bottom: 8, left: 36 }}>
                      <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                      />
                      <Radar
                        name={game1.name}
                        dataKey="A"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.25}
                        strokeWidth={1.5}
                      />
                      <Radar
                        name={game2.name}
                        dataKey="B"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.18}
                        strokeWidth={1.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-5 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                    <div className="w-3 h-0.5 rounded bg-purple-500" />
                    <span className="truncate max-w-[100px]">{game1.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                    <div className="w-3 h-0.5 rounded bg-blue-500" />
                    <span className="truncate max-w-[100px]">{game2.name}</span>
                  </div>
                </div>
              </div>

              {/* Relationship comparison */}
              {(rel1 || rel2) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Relationship</p>
                    <p className="text-xs font-bold leading-tight" style={{ color: rel1.color }}>
                      {rel1.label}
                    </p>
                    <p className="text-[9px] text-white/25 mt-1 truncate">{game1.name}</p>
                  </div>
                  {rel2 && (
                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">Relationship</p>
                      <p className="text-xs font-bold leading-tight" style={{ color: rel2.color }}>
                        {rel2.label}
                      </p>
                      <p className="text-[9px] text-white/25 mt-1 truncate">{game2.name}</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
