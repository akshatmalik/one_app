'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Trophy, ChevronDown } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getGameComparison,
  getTotalHours,
  ComparisonMetric,
  GameComparisonResult,
} from '../lib/calculations';
import clsx from 'clsx';

interface GameCompareModalProps {
  games: Game[];
  initialGameA?: Game | null;
  onClose: () => void;
}

// ── Game Picker Dropdown ──────────────────────────────────────

function GamePicker({
  games,
  selected,
  onChange,
  label,
  side,
}: {
  games: Game[];
  selected: Game | null;
  onChange: (game: Game | null) => void;
  label: string;
  side: 'A' | 'B';
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.genre && g.genre.toLowerCase().includes(q)) ||
        (g.platform && g.platform.toLowerCase().includes(q))
    );
  }, [games, search]);

  const accentBg = side === 'A' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-purple-500/10 border-purple-500/30';
  const placeholderText = side === 'A' ? 'text-blue-400/60' : 'text-purple-400/60';

  return (
    <div className="flex-1 relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left',
          selected ? accentBg : 'bg-white/[0.03] border-white/10'
        )}
      >
        {selected ? (
          <>
            {selected.thumbnail ? (
              <img
                src={selected.thumbnail}
                alt=""
                className="w-7 h-7 rounded-md object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-white/10 flex-shrink-0 flex items-center justify-center text-xs">
                🎮
              </div>
            )}
            <span className="flex-1 truncate text-sm font-medium text-white">{selected.name}</span>
          </>
        ) : (
          <span className={clsx('text-sm font-medium flex-1', placeholderText)}>Pick {label}…</span>
        )}
        <ChevronDown size={13} className="flex-shrink-0 text-white/20" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#13131a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games…"
                className="w-full pl-7 pr-3 py-1.5 bg-white/5 text-white text-xs rounded-lg placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-white/30">No games found</div>
            ) : (
              filtered.map((game) => (
                <button
                  key={game.id}
                  onClick={() => {
                    onChange(game);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                    selected?.id === game.id ? 'bg-white/10' : 'hover:bg-white/5'
                  )}
                >
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt=""
                      className="w-7 h-7 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-xs">
                      🎮
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/80 truncate font-medium">{game.name}</div>
                    <div className="text-[10px] text-white/30">
                      {game.status} · {getTotalHours(game).toFixed(0)}h · ★{game.rating || '—'}
                    </div>
                  </div>
                  {selected?.id === game.id && (
                    <div className="text-[10px] text-white/30">✓</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Metric Row ────────────────────────────────────────────────

function MetricRow({
  metric,
  nameA,
  nameB,
}: {
  metric: ComparisonMetric;
  nameA: string;
  nameB: string;
}) {
  const [hovered, setHovered] = useState(false);

  const barA = metric.winner === 'A' ? 'bg-blue-500' : metric.winner === 'tie' ? 'bg-white/20' : 'bg-white/8';
  const barB = metric.winner === 'B' ? 'bg-purple-500' : metric.winner === 'tie' ? 'bg-white/20' : 'bg-white/8';

  const textA =
    metric.winner === 'A'
      ? 'text-blue-400 font-semibold'
      : metric.winner === 'tie'
      ? 'text-white/50'
      : 'text-white/30';
  const textB =
    metric.winner === 'B'
      ? 'text-purple-400 font-semibold'
      : metric.winner === 'tie'
      ? 'text-white/50'
      : 'text-white/30';

  const shortA = nameA.split(' ')[0];
  const shortB = nameB.split(' ')[0];

  return (
    <div
      className="relative py-2 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        {/* A value */}
        <div className={clsx('w-[4.5rem] sm:w-20 text-right text-sm shrink-0', textA)}>
          {metric.displayA}
        </div>

        {/* Center: label + bars */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="text-[11px]">{metric.icon}</span>
            <span className="flex-1 min-w-0 truncate">{metric.label}</span>
            {metric.winner !== 'na' && metric.winner !== 'tie' && (
              <span
                className={clsx(
                  'shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded',
                  metric.winner === 'A'
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-purple-500/15 text-purple-400'
                )}
              >
                {metric.winner === 'A' ? shortA : shortB}
              </span>
            )}
            {metric.winner === 'tie' && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                tie
              </span>
            )}
          </div>
          {/* Dual bar */}
          <div className="flex items-center gap-0.5 h-1.5">
            {/* A bar — grows from right */}
            <div className="flex-1 flex justify-end">
              <div
                className={clsx('h-1.5 rounded-full transition-all duration-700', barA)}
                style={{ width: `${Math.max(4, metric.barPctA)}%` }}
              />
            </div>
            {/* Divider pip */}
            <div className="w-px h-2 bg-white/15 shrink-0" />
            {/* B bar — grows from left */}
            <div className="flex-1">
              <div
                className={clsx('h-1.5 rounded-full transition-all duration-700', barB)}
                style={{ width: `${Math.max(4, metric.barPctB)}%` }}
              />
            </div>
          </div>
        </div>

        {/* B value */}
        <div className={clsx('w-[4.5rem] sm:w-20 text-sm shrink-0', textB)}>
          {metric.displayB}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-10 px-2.5 py-1.5 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white/60 whitespace-nowrap pointer-events-none shadow-xl">
          {metric.note}
        </div>
      )}
    </div>
  );
}

// ── Swap icon SVG ─────────────────────────────────────────────

function SwapIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

// ── Main Modal ────────────────────────────────────────────────

export function GameCompareModal({ games, initialGameA, onClose }: GameCompareModalProps) {
  const [gameA, setGameA] = useState<Game | null>(initialGameA ?? null);
  const [gameB, setGameB] = useState<Game | null>(null);

  const handleSwap = () => {
    const tmp = gameA;
    setGameA(gameB);
    setGameB(tmp);
  };

  const result: GameComparisonResult | null = useMemo(() => {
    if (!gameA || !gameB || gameA.id === gameB.id) return null;
    return getGameComparison(gameA, gameB);
  }, [gameA, gameB]);

  const gamesForA = useMemo(() => games.filter((g) => g.id !== gameB?.id), [games, gameB?.id]);
  const gamesForB = useMemo(() => games.filter((g) => g.id !== gameA?.id), [games, gameA?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-2xl bg-[#0d0d18] sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-base">
              ⚔️
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">Game Showdown</h2>
              <p className="text-[10px] text-white/30 leading-tight">Head-to-head comparison</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Picker row */}
        <div className="px-5 py-3.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <GamePicker
              games={gamesForA}
              selected={gameA}
              onChange={setGameA}
              label="Game A"
              side="A"
            />
            <button
              onClick={handleSwap}
              disabled={!gameA || !gameB}
              className="shrink-0 p-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              title="Swap games"
            >
              <SwapIcon />
            </button>
            <GamePicker
              games={gamesForB}
              selected={gameB}
              onChange={setGameB}
              label="Game B"
              side="B"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!gameA || !gameB ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="text-5xl mb-4 opacity-30">⚔️</div>
              <p className="text-white/40 text-sm font-medium">Pick two games to start the battle</p>
              <p className="text-white/20 text-xs mt-1.5">
                Compare hours, ratings, cost-per-hour, ROI, and more
              </p>
            </div>
          ) : gameA.id === gameB.id ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <p className="text-white/30 text-sm">Can&apos;t compare a game to itself!</p>
            </div>
          ) : result ? (
            <div className="px-5 py-5 space-y-5">
              {/* Hero: side-by-side thumbnails */}
              <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/5">
                {/* Game A */}
                <div
                  className={clsx(
                    'relative p-5 flex flex-col items-center text-center',
                    result.overallWinner === 'A' ? 'bg-blue-600/10' : 'bg-white/[0.015]'
                  )}
                >
                  {result.overallWinner === 'A' && (
                    <div className="absolute top-2.5 left-2.5">
                      <Trophy size={14} className="text-yellow-400" />
                    </div>
                  )}
                  {gameA.thumbnail ? (
                    <img
                      src={gameA.thumbnail}
                      alt={gameA.name}
                      className="w-16 h-16 rounded-xl object-cover shadow-lg mb-2.5"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-2.5 text-3xl">
                      🎮
                    </div>
                  )}
                  <div className="text-sm font-semibold text-white leading-tight line-clamp-2">
                    {gameA.name}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">{gameA.status}</div>
                  <div
                    className={clsx(
                      'mt-2 text-xs font-bold px-2 py-0.5 rounded-full',
                      result.overallWinner === 'A'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-white/5 text-white/25'
                    )}
                  >
                    {result.winsA} win{result.winsA !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* VS divider */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#0d0d18] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40 select-none">
                  VS
                </div>

                {/* Game B */}
                <div
                  className={clsx(
                    'relative p-5 flex flex-col items-center text-center',
                    result.overallWinner === 'B' ? 'bg-purple-600/10' : 'bg-white/[0.015]'
                  )}
                >
                  {result.overallWinner === 'B' && (
                    <div className="absolute top-2.5 right-2.5">
                      <Trophy size={14} className="text-yellow-400" />
                    </div>
                  )}
                  {gameB.thumbnail ? (
                    <img
                      src={gameB.thumbnail}
                      alt={gameB.name}
                      className="w-16 h-16 rounded-xl object-cover shadow-lg mb-2.5"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-2.5 text-3xl">
                      🎮
                    </div>
                  )}
                  <div className="text-sm font-semibold text-white leading-tight line-clamp-2">
                    {gameB.name}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">{gameB.status}</div>
                  <div
                    className={clsx(
                      'mt-2 text-xs font-bold px-2 py-0.5 rounded-full',
                      result.overallWinner === 'B'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-white/5 text-white/25'
                    )}
                  >
                    {result.winsB} win{result.winsB !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Score line */}
              <div className="text-center">
                <div className="text-3xl font-bold tracking-tight">
                  <span className="text-blue-400">{result.winsA}</span>
                  <span className="text-white/20 mx-2.5 text-2xl">–</span>
                  <span className="text-purple-400">{result.winsB}</span>
                </div>
                <div className="text-xs text-white/35 mt-0.5">
                  {result.overallWinner !== 'tie' ? (
                    <>
                      {result.overallWinner === 'A' ? gameA.name : gameB.name} wins
                      {result.ties > 0 &&
                        ` · ${result.ties} tie${result.ties > 1 ? 's' : ''}`}
                    </>
                  ) : (
                    'Dead heat — too close to call'
                  )}
                </div>
              </div>

              {/* Stat battle */}
              <div>
                <SectionDivider label="Stat Battle" />
                <div className="space-y-0.5 mt-3">
                  {result.metrics
                    .filter((m) => m.winner !== 'na')
                    .map((metric) => (
                      <MetricRow
                        key={metric.id}
                        metric={metric}
                        nameA={gameA.name}
                        nameB={gameB.name}
                      />
                    ))}
                </div>
                {/* Column headers */}
                <div className="flex items-center gap-3 mt-3 px-2 -mx-2">
                  <div className="w-[4.5rem] sm:w-20 text-right text-[10px] font-bold text-blue-400/60 shrink-0">
                    {gameA.name.split(' ')[0]}
                  </div>
                  <div className="flex-1" />
                  <div className="w-[4.5rem] sm:w-20 text-[10px] font-bold text-purple-400/60 shrink-0">
                    {gameB.name.split(' ')[0]}
                  </div>
                </div>
              </div>

              {/* Verdicts */}
              <div>
                <SectionDivider label="Verdicts" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {result.verdicts.map((v, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-start gap-2 px-3 py-2.5 rounded-xl border',
                        v.winner === 'A'
                          ? 'bg-blue-500/8 border-blue-500/20'
                          : v.winner === 'B'
                          ? 'bg-purple-500/8 border-purple-500/20'
                          : 'bg-white/[0.02] border-white/5'
                      )}
                    >
                      <span className="text-base mt-0.5 shrink-0">{v.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[10px] text-white/40 leading-tight">{v.label}</div>
                        <div
                          className={clsx(
                            'text-xs font-semibold mt-0.5 truncate leading-tight',
                            v.winner === 'A'
                              ? 'text-blue-400'
                              : v.winner === 'B'
                              ? 'text-purple-400'
                              : 'text-white/30'
                          )}
                        >
                          {v.winner === 'tie'
                            ? 'Tied'
                            : v.winner === 'A'
                            ? gameA.name.split(' ').slice(0, 2).join(' ')
                            : gameB.name.split(' ').slice(0, 2).join(' ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Narrative */}
              <div className="bg-white/[0.025] border border-white/5 rounded-xl p-4">
                <p className="text-sm text-white/55 leading-relaxed italic">
                  &ldquo;{result.narrative}&rdquo;
                </p>
              </div>

              {/* Bottom spacer for mobile */}
              <div className="h-2" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}
