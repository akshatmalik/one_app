'use client';

import { useState, useMemo } from 'react';
import { X, Trophy, Search } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import clsx from 'clsx';

interface GameComparisonModalProps {
  games: GameWithMetrics[];
  onClose: () => void;
}

type Side = 'a' | 'b' | 'tie';

interface MetricRow {
  label: string;
  valueA: string;
  valueB: string;
  winner: Side;
  barA: number; // 0-1
  barB: number; // 0-1
  points: number;
  higherIsBetter?: boolean; // for bar direction labeling
}

const STATUS_SCORE: Record<string, number> = {
  Completed: 5, 'In Progress': 4, 'Not Started': 3, Abandoned: 2, Wishlist: 1,
};
const VALUE_SCORE: Record<string, number> = {
  Excellent: 4, Good: 3, Fair: 2, Poor: 1,
};
const STATUS_COLORS: Record<string, string> = {
  Completed: 'text-emerald-400',
  'In Progress': 'text-blue-400',
  'Not Started': 'text-white/40',
  Abandoned: 'text-red-400/70',
  Wishlist: 'text-purple-400',
};
const VALUE_COLORS: Record<string, string> = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Fair: 'text-yellow-400',
  Poor: 'text-red-400',
};

function fmtHours(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}

function buildRows(a: GameWithMetrics, b: GameWithMetrics): MetricRow[] {
  const rows: MetricRow[] = [];

  // ─── Price ───────────────────────────────────────────────
  const maxPrice = Math.max(a.price, b.price, 0.01);
  rows.push({
    label: 'Price Paid',
    valueA: `$${a.price.toFixed(0)}`,
    valueB: `$${b.price.toFixed(0)}`,
    // lower price wins (for the same content)
    winner: a.price === b.price ? 'tie' : a.price < b.price ? 'a' : 'b',
    barA: 1 - a.price / maxPrice,
    barB: 1 - b.price / maxPrice,
    points: 1,
  });

  // ─── Hours ───────────────────────────────────────────────
  const maxHours = Math.max(a.totalHours, b.totalHours, 0.01);
  rows.push({
    label: 'Total Hours',
    valueA: fmtHours(a.totalHours),
    valueB: fmtHours(b.totalHours),
    winner: a.totalHours === b.totalHours ? 'tie' : a.totalHours > b.totalHours ? 'a' : 'b',
    barA: a.totalHours / maxHours,
    barB: b.totalHours / maxHours,
    points: 2,
    higherIsBetter: true,
  });

  // ─── Cost per Hour ───────────────────────────────────────
  if (a.totalHours > 0 || b.totalHours > 0) {
    const cphA = a.totalHours > 0 ? a.metrics.costPerHour : null;
    const cphB = b.totalHours > 0 ? b.metrics.costPerHour : null;
    let winner: Side = 'tie';
    if (cphA !== null && cphB !== null) {
      winner = Math.abs(cphA - cphB) < 0.01 ? 'tie' : cphA < cphB ? 'a' : 'b';
    } else if (cphA !== null) winner = 'a';
    else if (cphB !== null) winner = 'b';
    const maxCph = Math.max(cphA ?? 0, cphB ?? 0, 0.01);
    rows.push({
      label: '$/Hour',
      valueA: cphA !== null ? `$${cphA.toFixed(2)}/hr` : '—',
      valueB: cphB !== null ? `$${cphB.toFixed(2)}/hr` : '—',
      winner,
      // inverted: lower $/hr fills the bar more
      barA: cphA !== null ? 1 - cphA / maxCph : 0,
      barB: cphB !== null ? 1 - cphB / maxCph : 0,
      points: 3,
    });
  }

  // ─── Rating ──────────────────────────────────────────────
  if (a.rating > 0 || b.rating > 0) {
    const rA = a.rating, rB = b.rating;
    rows.push({
      label: 'Your Rating',
      valueA: rA > 0 ? `${rA}/10` : '—',
      valueB: rB > 0 ? `${rB}/10` : '—',
      winner: rA === rB ? 'tie' : rA > rB ? 'a' : 'b',
      barA: rA / 10,
      barB: rB / 10,
      points: 3,
      higherIsBetter: true,
    });
  }

  // ─── ROI ────────────────────────────────────────────────
  const roiA = a.metrics.roi, roiB = b.metrics.roi;
  if (roiA > 0 || roiB > 0) {
    const maxRoi = Math.max(roiA, roiB, 0.01);
    rows.push({
      label: 'ROI Score',
      valueA: roiA > 0 ? roiA.toFixed(1) : '—',
      valueB: roiB > 0 ? roiB.toFixed(1) : '—',
      winner: Math.abs(roiA - roiB) < 0.1 ? 'tie' : roiA > roiB ? 'a' : 'b',
      barA: roiA / maxRoi,
      barB: roiB / maxRoi,
      points: 2,
      higherIsBetter: true,
    });
  }

  // ─── Sessions ────────────────────────────────────────────
  const sA = (a.playLogs ?? []).length, sB = (b.playLogs ?? []).length;
  const maxS = Math.max(sA, sB, 1);
  rows.push({
    label: 'Sessions',
    valueA: `${sA}`,
    valueB: `${sB}`,
    winner: sA === sB ? 'tie' : sA > sB ? 'a' : 'b',
    barA: sA / maxS,
    barB: sB / maxS,
    points: 1,
    higherIsBetter: true,
  });

  // ─── Avg Session ─────────────────────────────────────────
  if (sA > 0 || sB > 0) {
    const avgA = sA > 0 ? a.totalHours / sA : 0;
    const avgB = sB > 0 ? b.totalHours / sB : 0;
    const maxAvg = Math.max(avgA, avgB, 0.01);
    rows.push({
      label: 'Avg Session',
      valueA: sA > 0 ? fmtHours(avgA) : '—',
      valueB: sB > 0 ? fmtHours(avgB) : '—',
      winner: Math.abs(avgA - avgB) < 0.05 ? 'tie' : avgA > avgB ? 'a' : 'b',
      barA: avgA / maxAvg,
      barB: avgB / maxAvg,
      points: 1,
      higherIsBetter: true,
    });
  }

  // ─── Best Session ─────────────────────────────────────────
  const bestA = (a.playLogs ?? []).reduce((m, l) => Math.max(m, l.hours), 0);
  const bestB = (b.playLogs ?? []).reduce((m, l) => Math.max(m, l.hours), 0);
  if (bestA > 0 || bestB > 0) {
    const maxBest = Math.max(bestA, bestB, 0.01);
    rows.push({
      label: 'Best Session',
      valueA: bestA > 0 ? fmtHours(bestA) : '—',
      valueB: bestB > 0 ? fmtHours(bestB) : '—',
      winner: Math.abs(bestA - bestB) < 0.05 ? 'tie' : bestA > bestB ? 'a' : 'b',
      barA: bestA / maxBest,
      barB: bestB / maxBest,
      points: 1,
      higherIsBetter: true,
    });
  }

  // ─── Status ──────────────────────────────────────────────
  const ssA = STATUS_SCORE[a.status] ?? 0;
  const ssB = STATUS_SCORE[b.status] ?? 0;
  rows.push({
    label: 'Status',
    valueA: a.status,
    valueB: b.status,
    winner: ssA === ssB ? 'tie' : ssA > ssB ? 'a' : 'b',
    barA: ssA / 5,
    barB: ssB / 5,
    points: 1,
  });

  // ─── Value Tier ──────────────────────────────────────────
  if (a.totalHours > 0 || b.totalHours > 0) {
    const vtA = VALUE_SCORE[a.metrics.valueRating] ?? 0;
    const vtB = VALUE_SCORE[b.metrics.valueRating] ?? 0;
    rows.push({
      label: 'Value Tier',
      valueA: a.totalHours > 0 ? a.metrics.valueRating : '—',
      valueB: b.totalHours > 0 ? b.metrics.valueRating : '—',
      winner: vtA === vtB ? 'tie' : vtA > vtB ? 'a' : 'b',
      barA: vtA / 4,
      barB: vtB / 4,
      points: 2,
    });
  }

  return rows;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectorProps {
  label: string;
  accent: string; // tailwind color key e.g. "blue" or "rose"
  selected: GameWithMetrics | null;
  filteredGames: GameWithMetrics[];
  search: string;
  isOpen: boolean;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onToggle: () => void;
}

function GameSelector({ label, accent, selected, filteredGames, search, isOpen, onSearchChange, onSelect, onClear, onToggle }: SelectorProps) {
  const borderColor = accent === 'blue' ? 'border-blue-500/30' : 'border-rose-500/30';
  const textColor = accent === 'blue' ? 'text-blue-400' : 'text-rose-400';
  const bgGlow = accent === 'blue' ? 'from-blue-500/10 to-blue-500/5' : 'from-rose-500/10 to-rose-500/5';

  return (
    <div className="relative">
      <p className={clsx('text-[10px] font-bold uppercase tracking-wider mb-1.5', textColor)}>{label}</p>

      {selected ? (
        <div
          className={clsx(
            'relative p-3 rounded-xl border cursor-pointer bg-gradient-to-br',
            borderColor, bgGlow
          )}
          onClick={onToggle}
        >
          {selected.thumbnail && (
            <img src={selected.thumbnail} alt="" className="w-full h-24 object-cover rounded-lg mb-2 opacity-80" />
          )}
          {!selected.thumbnail && (
            <div className="w-full h-24 rounded-lg mb-2 bg-white/5 flex items-center justify-center">
              <span className="text-3xl">🎮</span>
            </div>
          )}
          <p className={clsx('text-sm font-bold leading-tight', textColor)}>{selected.name}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{selected.status}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          onClick={onToggle}
          className={clsx(
            'w-full p-3 rounded-xl border border-dashed text-left transition-all',
            isOpen ? `${borderColor} bg-white/[0.03]` : 'border-white/10 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-2 text-white/30">
            <Search size={12} />
            <span className="text-xs">Search games…</span>
          </div>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#12121e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 text-white text-xs rounded-lg placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredGames.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No games found</p>
              ) : filteredGames.map(g => (
                <button
                  key={g.id}
                  onClick={() => onSelect(g.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0 text-sm">🎮</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/80 truncate">{g.name}</p>
                    <p className="text-[9px] text-white/30">{g.status} · {g.genre ?? '—'}</p>
                  </div>
                  {g.rating > 0 && (
                    <span className="text-[9px] text-yellow-400/60 shrink-0">{g.rating}/10</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface RowProps {
  row: MetricRow;
  colorA: string;
  colorB: string;
  valueColorA?: string | undefined;
  valueColorB?: string | undefined;
}

function MetricRowDisplay({ row, colorA, colorB, valueColorA, valueColorB }: RowProps) {
  const winnerIcon = (side: Side) =>
    row.winner === side ? (
      <span className="text-amber-400 text-[10px]">★</span>
    ) : row.winner === 'tie' ? (
      <span className="text-white/20 text-[9px]">=</span>
    ) : null;

  const barColor = (side: Side) =>
    side === 'a'
      ? row.winner === 'a' ? 'bg-blue-400/80' : row.winner === 'tie' ? 'bg-blue-400/40' : 'bg-blue-400/20'
      : row.winner === 'b' ? 'bg-rose-400/80' : row.winner === 'tie' ? 'bg-rose-400/40' : 'bg-rose-400/20';

  const hasBar = row.barA > 0 || row.barB > 0;

  return (
    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/40 font-medium flex-1">{row.label}</span>
        {row.winner !== 'tie' && (
          <span className="text-[9px] text-amber-400/60 font-medium">
            +{row.points} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Side A */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            {winnerIcon('a')}
            <span className={clsx(
              'text-sm font-bold',
              valueColorA ??
              (row.winner === 'a' ? 'text-blue-300' : row.winner === 'tie' ? 'text-white/60' : 'text-white/30')
            )}>
              {row.valueA}
            </span>
          </div>
          {hasBar && (
            <div className="flex justify-end mt-1.5">
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden flex justify-end">
                <div
                  className={clsx('h-full rounded-full transition-all duration-500', barColor('a'))}
                  style={{ width: `${Math.round(row.barA * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center label */}
        <div className="text-center">
          {row.winner === 'tie' ? (
            <span className="text-white/20 text-xs font-bold">TIE</span>
          ) : (
            <span className="text-white/10 text-xs">vs</span>
          )}
        </div>

        {/* Side B */}
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className={clsx(
              'text-sm font-bold',
              valueColorB ??
              (row.winner === 'b' ? 'text-rose-300' : row.winner === 'tie' ? 'text-white/60' : 'text-white/30')
            )}>
              {row.valueB}
            </span>
            {winnerIcon('b')}
          </div>
          {hasBar && (
            <div className="mt-1.5">
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-500', barColor('b'))}
                  style={{ width: `${Math.round(row.barB * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GameComparisonModal({ games, onClose }: GameComparisonModalProps) {
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);

  const playedGames = useMemo(() => games.filter(g => g.status !== 'Wishlist'), [games]);

  const gameA = useMemo(() => selectedA ? games.find(g => g.id === selectedA) ?? null : null, [games, selectedA]);
  const gameB = useMemo(() => selectedB ? games.find(g => g.id === selectedB) ?? null : null, [games, selectedB]);

  const filteredA = useMemo(() => {
    const q = searchA.toLowerCase();
    return playedGames.filter(g => g.id !== selectedB && g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [playedGames, searchA, selectedB]);

  const filteredB = useMemo(() => {
    const q = searchB.toLowerCase();
    return playedGames.filter(g => g.id !== selectedA && g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [playedGames, searchB, selectedA]);

  const rows = useMemo<MetricRow[]>(() => {
    if (!gameA || !gameB) return [];
    return buildRows(gameA, gameB);
  }, [gameA, gameB]);

  const { scoreA, scoreB } = useMemo(() => {
    let a = 0, b = 0;
    rows.forEach(r => {
      if (r.winner === 'a') a += r.points;
      if (r.winner === 'b') b += r.points;
    });
    return { scoreA: a, scoreB: b };
  }, [rows]);

  const overall: Side | null = useMemo(() => {
    if (!gameA || !gameB || rows.length === 0) return null;
    if (scoreA > scoreB) return 'a';
    if (scoreB > scoreA) return 'b';
    return 'tie';
  }, [gameA, gameB, rows, scoreA, scoreB]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
      <div className="relative w-full max-w-xl bg-[#0e0e17] border border-white/10 rounded-2xl shadow-2xl my-2">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
              <Trophy size={15} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Head to Head</h2>
              <p className="text-[10px] text-white/40">Compare any two games from your library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Game Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <GameSelector
              label="Game A"
              accent="blue"
              selected={gameA}
              filteredGames={filteredA}
              search={searchA}
              isOpen={openA}
              onSearchChange={(v) => { setSearchA(v); setOpenA(true); }}
              onSelect={(id) => { setSelectedA(id); setOpenA(false); setSearchA(''); }}
              onClear={() => setSelectedA(null)}
              onToggle={() => setOpenA(v => !v)}
            />
            <GameSelector
              label="Game B"
              accent="rose"
              selected={gameB}
              filteredGames={filteredB}
              search={searchB}
              isOpen={openB}
              onSearchChange={(v) => { setSearchB(v); setOpenB(true); }}
              onSelect={(id) => { setSelectedB(id); setOpenB(false); setSearchB(''); }}
              onClear={() => setSelectedB(null)}
              onToggle={() => setOpenB(v => !v)}
            />
          </div>

          {/* Scores banner when both selected */}
          {gameA && gameB && rows.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
              <div className="text-center">
                <div className="text-2xl font-black text-blue-400">{scoreA}</div>
                <div className="text-[9px] text-white/30 truncate">{gameA.name}</div>
              </div>
              <div className="text-white/20 text-xs font-bold px-1">pts</div>
              <div className="text-center">
                <div className="text-2xl font-black text-rose-400">{scoreB}</div>
                <div className="text-[9px] text-white/30 truncate">{gameB.name}</div>
              </div>
            </div>
          )}

          {/* Comparison rows */}
          {gameA && gameB && rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map((row, i) => {
                const vcA = row.label === 'Status' ? STATUS_COLORS[row.valueA] :
                            row.label === 'Value Tier' ? VALUE_COLORS[row.valueA] : undefined;
                const vcB = row.label === 'Status' ? STATUS_COLORS[row.valueB] :
                            row.label === 'Value Tier' ? VALUE_COLORS[row.valueB] : undefined;
                return (
                  <MetricRowDisplay
                    key={i}
                    row={row}
                    colorA="blue"
                    colorB="rose"
                    valueColorA={vcA}
                    valueColorB={vcB}
                  />
                );
              })}
            </div>
          )}

          {/* Verdict */}
          {overall !== null && (
            <div className={clsx(
              'p-4 rounded-xl border text-center',
              overall === 'a' ? 'bg-blue-500/10 border-blue-500/20' :
              overall === 'b' ? 'bg-rose-500/10 border-rose-500/20' :
              'bg-white/5 border-white/10'
            )}>
              {overall === 'tie' ? (
                <>
                  <p className="text-sm font-bold text-white mb-0.5">Perfectly Matched</p>
                  <p className="text-xs text-white/40">Both scored {scoreA} points — it's a genuine tie</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Trophy size={13} className={overall === 'a' ? 'text-amber-400' : 'text-amber-400'} />
                    <span className="text-[10px] text-amber-400/70 font-bold uppercase tracking-widest">Winner</span>
                  </div>
                  <p className={clsx(
                    'text-base font-bold',
                    overall === 'a' ? 'text-blue-300' : 'text-rose-300'
                  )}>
                    {overall === 'a' ? gameA!.name : gameB!.name}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">
                    {overall === 'a' ? scoreA : scoreB} points vs {overall === 'a' ? scoreB : scoreA} points
                  </p>
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {(!gameA || !gameB) && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-3 text-white/10 mb-2">
                <div className="w-16 h-10 rounded-lg bg-blue-500/5 border border-blue-500/10" />
                <span className="text-lg font-bold">vs</span>
                <div className="w-16 h-10 rounded-lg bg-rose-500/5 border border-rose-500/10" />
              </div>
              <p className="text-xs text-white/25">Select two games above to compare them</p>
            </div>
          )}

          {/* Tips */}
          <p className="text-[10px] text-white/20 text-center">
            Points are weighted — hours and rating count more than session count
          </p>
        </div>
      </div>
    </div>
  );
}
