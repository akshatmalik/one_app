'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Swords, Search, Trophy, Minus } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import {
  getGameComparison,
  getRelationshipStatus,
  getCardRarity,
} from '../lib/calculations';
import clsx from 'clsx';

interface GameComparePanelProps {
  allGames: GameWithMetrics[];
  onClose: () => void;
  initialGame?: GameWithMetrics | null;
}

const VALUE_COLORS: Record<string, string> = {
  Excellent: '#10b981',
  Good: '#60a5fa',
  Fair: '#facc15',
  Poor: '#f87171',
};

const RARITY_COLORS: Record<string, string> = {
  legendary: '#fbbf24',
  epic: '#a855f7',
  rare: '#60a5fa',
  uncommon: '#4ade80',
  common: '#ffffff40',
};

function GameSelector({
  label,
  selected,
  allGames,
  otherGameId,
  onSelect,
  onClear,
}: {
  label: string;
  selected: GameWithMetrics | null;
  allGames: GameWithMetrics[];
  otherGameId?: string;
  onSelect: (game: GameWithMetrics) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allGames
      .filter(g => g.status !== 'Wishlist' && g.id !== otherGameId)
      .filter(g =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.genre?.toLowerCase() ?? '').includes(q) ||
        (g.platform?.toLowerCase() ?? '').includes(q)
      )
      .slice(0, 8);
  }, [allGames, query, otherGameId]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      {/* Trigger */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none',
          selected
            ? 'bg-white/5 border-white/15 hover:border-white/25'
            : 'bg-white/[0.02] border-dashed border-white/10 hover:border-white/20',
        )}
        onClick={() => { setOpen(!open); setQuery(''); }}
      >
        {selected ? (
          <>
            {selected.thumbnail ? (
              <img src={selected.thumbnail} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-sm">🎮</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{selected.name}</div>
              <div className="text-[10px] text-white/40 truncate">
                {selected.status} · {selected.totalHours > 0 ? `${selected.totalHours.toFixed(0)}h` : 'unplayed'}{selected.genre ? ` · ${selected.genre}` : ''}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onClear(); }}
              className="flex-shrink-0 text-white/30 hover:text-white/60 p-0.5"
              aria-label="Clear selection"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <Search size={14} className="text-white/30 flex-shrink-0" />
            <span className="text-sm text-white/30">{label}</span>
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/30 text-center">No matching games</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filtered.map(g => (
                <button
                  key={g.id}
                  onClick={() => { onSelect(g); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-sm">🎮</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/80 truncate">{g.name}</div>
                    <div className="text-[10px] text-white/30">
                      {g.status} · {g.totalHours > 0 ? `${g.totalHours.toFixed(0)}h` : 'unplayed'} · {g.rating > 0 ? `${g.rating}/10` : 'unrated'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GameComparePanel({ allGames, onClose, initialGame }: GameComparePanelProps) {
  const [game1, setGame1] = useState<GameWithMetrics | null>(initialGame ?? null);
  const [game2, setGame2] = useState<GameWithMetrics | null>(null);

  const comparison = useMemo(() => {
    if (!game1 || !game2) return null;
    return getGameComparison(game1, game2);
  }, [game1, game2]);

  const rarity1 = useMemo(() => game1 ? getCardRarity(game1) : null, [game1]);
  const rarity2 = useMemo(() => game2 ? getCardRarity(game2) : null, [game2]);
  const rel1 = useMemo(() => game1 ? getRelationshipStatus(game1, allGames) : null, [game1, allGames]);
  const rel2 = useMemo(() => game2 ? getRelationshipStatus(game2, allGames) : null, [game2, allGames]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-white">Head-to-Head</h2>
            <span className="text-sm text-white/30">Compare any two games</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Game selectors */}
        <div className="px-5 py-4 flex items-center gap-3">
          <GameSelector
            label="Pick Game A..."
            selected={game1}
            allGames={allGames}
            otherGameId={game2?.id}
            onSelect={setGame1}
            onClear={() => setGame1(null)}
          />
          <div className="flex-shrink-0 w-8 flex flex-col items-center">
            <span className="text-[11px] font-bold text-white/20 uppercase tracking-wider">vs</span>
          </div>
          <GameSelector
            label="Pick Game B..."
            selected={game2}
            allGames={allGames}
            otherGameId={game1?.id}
            onSelect={setGame2}
            onClear={() => setGame2(null)}
          />
        </div>

        {/* Empty state */}
        {(!game1 || !game2) && (
          <div className="px-5 pb-8 pt-2 text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center mx-auto mb-3">
              <Swords size={24} className="text-white/15" />
            </div>
            <div className="text-white/20 text-sm">Select two games to compare them side by side</div>
            <div className="text-white/10 text-xs mt-1">Hours, rating, value, ROI, sessions, and more</div>
          </div>
        )}

        {/* Comparison content */}
        {game1 && game2 && comparison && (
          <>
            {/* Game header cards */}
            <div className="px-5 pb-4">
              <div className="grid grid-cols-[1fr,36px,1fr] gap-3 items-start">
                {/* Game 1 card */}
                <div className={clsx(
                  'text-center p-3 rounded-xl border transition-all',
                  comparison.overallWinner === 1
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : comparison.overallWinner === 2
                      ? 'border-white/5 bg-white/[0.02] opacity-80'
                      : 'border-white/10 bg-white/[0.02]',
                )}>
                  {game1.thumbnail ? (
                    <img src={game1.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover mx-auto mb-2" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-2 text-2xl">🎮</div>
                  )}
                  <div className="text-sm font-semibold text-white leading-tight mb-1">{game1.name}</div>
                  {rarity1 && (
                    <div className="text-[10px] font-medium" style={{ color: RARITY_COLORS[rarity1.tier] }}>
                      {rarity1.label}
                    </div>
                  )}
                  {rel1 && rel1.label !== 'Normal' && (
                    <div className="text-[10px] text-white/35 mt-0.5">{rel1.label}</div>
                  )}
                  {comparison.overallWinner === 1 && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Trophy size={11} className="text-yellow-400" />
                      <span className="text-[10px] font-bold text-yellow-400">Winner</span>
                    </div>
                  )}
                  {comparison.overallWinner === 'tie' && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Minus size={11} className="text-white/30" />
                      <span className="text-[10px] text-white/30">Tied</span>
                    </div>
                  )}
                </div>

                {/* VS divider */}
                <div className="flex flex-col items-center justify-center pt-3 gap-1">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Swords size={13} className="text-white/25" />
                  </div>
                  <div className="text-[9px] font-bold text-white/20 text-center leading-tight">
                    {comparison.game1Wins}–{comparison.game2Wins}
                  </div>
                </div>

                {/* Game 2 card */}
                <div className={clsx(
                  'text-center p-3 rounded-xl border transition-all',
                  comparison.overallWinner === 2
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : comparison.overallWinner === 1
                      ? 'border-white/5 bg-white/[0.02] opacity-80'
                      : 'border-white/10 bg-white/[0.02]',
                )}>
                  {game2.thumbnail ? (
                    <img src={game2.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover mx-auto mb-2" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-2 text-2xl">🎮</div>
                  )}
                  <div className="text-sm font-semibold text-white leading-tight mb-1">{game2.name}</div>
                  {rarity2 && (
                    <div className="text-[10px] font-medium" style={{ color: RARITY_COLORS[rarity2.tier] }}>
                      {rarity2.label}
                    </div>
                  )}
                  {rel2 && rel2.label !== 'Normal' && (
                    <div className="text-[10px] text-white/35 mt-0.5">{rel2.label}</div>
                  )}
                  {comparison.overallWinner === 2 && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Trophy size={11} className="text-yellow-400" />
                      <span className="text-[10px] font-bold text-yellow-400">Winner</span>
                    </div>
                  )}
                  {comparison.overallWinner === 'tie' && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Minus size={11} className="text-white/30" />
                      <span className="text-[10px] text-white/30">Tied</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats table */}
            <div className="px-5 pb-4">
              <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2 px-1">
                Stats Breakdown
              </div>
              <div className="rounded-xl border border-white/5 overflow-hidden">
                {comparison.stats.map((stat, i) => (
                  <div
                    key={stat.key}
                    className={clsx(
                      'grid items-center',
                      i > 0 && 'border-t border-white/5',
                    )}
                    style={{ gridTemplateColumns: '1fr 100px 1fr' }}
                  >
                    {/* Game 1 value */}
                    <div className={clsx(
                      'px-3 py-2.5 text-right',
                      stat.winner === 1 && 'bg-yellow-500/[0.06]',
                    )}>
                      <span
                        className={clsx(
                          'text-sm font-medium inline-flex items-center justify-end gap-1',
                          stat.winner === 1 ? 'text-yellow-300' : 'text-white/45',
                        )}
                        style={stat.key === 'value' && stat.winner === 1 ? { color: VALUE_COLORS[stat.value1] || undefined } : undefined}
                      >
                        {stat.winner === 1 && <Trophy size={10} className="text-yellow-400 flex-shrink-0" />}
                        {stat.value1}
                      </span>
                    </div>

                    {/* Stat label (center column) */}
                    <div className="px-2 py-2.5 text-center bg-white/[0.015] border-x border-white/5">
                      <div className="text-[10px] text-white/30 whitespace-nowrap leading-tight">
                        <span className="mr-1">{stat.emoji}</span>
                        {stat.label}
                      </div>
                      {stat.winner === 'tie' && (
                        <div className="flex items-center justify-center mt-0.5">
                          <Minus size={8} className="text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Game 2 value */}
                    <div className={clsx(
                      'px-3 py-2.5 text-left',
                      stat.winner === 2 && 'bg-yellow-500/[0.06]',
                    )}>
                      <span
                        className={clsx(
                          'text-sm font-medium inline-flex items-center gap-1',
                          stat.winner === 2 ? 'text-yellow-300' : 'text-white/45',
                        )}
                        style={stat.key === 'value' && stat.winner === 2 ? { color: VALUE_COLORS[stat.value2] || undefined } : undefined}
                      >
                        {stat.value2}
                        {stat.winner === 2 && <Trophy size={10} className="text-yellow-400 flex-shrink-0" />}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Score row */}
              <div className="flex items-center justify-between mt-2 px-2">
                <span className={clsx(
                  'text-xs font-bold',
                  comparison.overallWinner === 1 ? 'text-yellow-400' : 'text-white/25',
                )}>
                  {comparison.game1Wins} wins
                </span>
                {comparison.ties > 0 && (
                  <span className="text-[10px] text-white/20">{comparison.ties} tied</span>
                )}
                <span className={clsx(
                  'text-xs font-bold',
                  comparison.overallWinner === 2 ? 'text-yellow-400' : 'text-white/25',
                )}>
                  {comparison.game2Wins} wins
                </span>
              </div>
            </div>

            {/* Verdict */}
            <div className={clsx(
              'mx-5 mb-5 p-4 rounded-xl border',
              comparison.overallWinner === 'tie'
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-yellow-500/[0.07] border-yellow-500/20',
            )}>
              <div className="flex items-start gap-2.5">
                {comparison.overallWinner !== 'tie' ? (
                  <Trophy size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Minus size={15} className="text-white/25 flex-shrink-0 mt-0.5" />
                )}
                <p className={clsx(
                  'text-sm leading-relaxed',
                  comparison.overallWinner !== 'tie' ? 'text-yellow-100/80' : 'text-white/40',
                )}>
                  {comparison.verdict}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
