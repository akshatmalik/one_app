'use client';

import { useState, useMemo } from 'react';
import { X, Search, Gamepad2, Clock, DollarSign, Star, TrendingUp, Flame, BarChart2, Check, Award, ChevronLeft, Swords, Equal } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { getTotalHours, getGameStreak } from '../lib/calculations';
import clsx from 'clsx';

interface GameCompareModalProps {
  games: GameWithMetrics[];
  isOpen: boolean;
  onClose: () => void;
}

type WinnerSide = 'left' | 'right' | 'tie';

interface CompareRow {
  label: string;
  icon: React.ReactNode;
  leftDisplay: string;
  rightDisplay: string;
  winner: WinnerSide;
  weight: number;
}

function determineWinner(leftRaw: number, rightRaw: number, lowerIsBetter = false): WinnerSide {
  const epsilon = 0.001;
  if (Math.abs(leftRaw - rightRaw) < epsilon) return 'tie';
  const leftWins = lowerIsBetter ? leftRaw < rightRaw : leftRaw > rightRaw;
  return leftWins ? 'left' : 'right';
}

function fmtHours(h: number): string {
  if (h === 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

function fmtCPH(cph: number, hours: number): string {
  if (hours === 0) return '—';
  if (cph === 0) return 'Free';
  return `$${cph.toFixed(2)}/hr`;
}

function statusScore(status: string): number {
  const map: Record<string, number> = { Completed: 5, 'In Progress': 4, 'Not Started': 2, Abandoned: 1, Wishlist: 0 };
  return map[status] ?? 0;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    Completed: '✓ Completed', 'In Progress': '▶ In Progress',
    'Not Started': '○ Not Started', Abandoned: '✗ Abandoned', Wishlist: '♡ Wishlist',
  };
  return labels[status] ?? status;
}

function buildRows(a: GameWithMetrics, b: GameWithMetrics): CompareRow[] {
  const hoursA = getTotalHours(a);
  const hoursB = getTotalHours(b);
  const sessA = (a.playLogs || []).length;
  const sessB = (b.playLogs || []).length;
  const streakA = getGameStreak(a).days;
  const streakB = getGameStreak(b).days;
  const avgSessA = sessA > 0 ? hoursA / sessA : 0;
  const avgSessB = sessB > 0 ? hoursB / sessB : 0;
  const cphA = a.metrics.costPerHour;
  const cphB = b.metrics.costPerHour;

  return [
    {
      label: 'Your Rating',
      icon: <Star size={13} />,
      leftDisplay: a.rating > 0 ? `${a.rating}/10` : '—',
      rightDisplay: b.rating > 0 ? `${b.rating}/10` : '—',
      winner: determineWinner(a.rating, b.rating),
      weight: 3,
    },
    {
      label: 'Total Hours',
      icon: <Clock size={13} />,
      leftDisplay: fmtHours(hoursA),
      rightDisplay: fmtHours(hoursB),
      winner: determineWinner(hoursA, hoursB),
      weight: 2,
    },
    {
      label: 'Cost / Hour',
      icon: <DollarSign size={13} />,
      leftDisplay: fmtCPH(cphA, hoursA),
      rightDisplay: fmtCPH(cphB, hoursB),
      winner: hoursA === 0 && hoursB === 0 ? 'tie' : determineWinner(
        hoursA > 0 ? cphA : 9999,
        hoursB > 0 ? cphB : 9999,
        true
      ),
      weight: 3,
    },
    {
      label: 'ROI',
      icon: <TrendingUp size={13} />,
      leftDisplay: a.metrics.roi > 0 ? a.metrics.roi.toFixed(1) : '—',
      rightDisplay: b.metrics.roi > 0 ? b.metrics.roi.toFixed(1) : '—',
      winner: determineWinner(a.metrics.roi, b.metrics.roi),
      weight: 2,
    },
    {
      label: 'Sessions',
      icon: <BarChart2 size={13} />,
      leftDisplay: sessA > 0 ? String(sessA) : '—',
      rightDisplay: sessB > 0 ? String(sessB) : '—',
      winner: determineWinner(sessA, sessB),
      weight: 1,
    },
    {
      label: 'Avg Session',
      icon: <Clock size={13} />,
      leftDisplay: avgSessA > 0 ? fmtHours(avgSessA) : '—',
      rightDisplay: avgSessB > 0 ? fmtHours(avgSessB) : '—',
      winner: determineWinner(avgSessA, avgSessB),
      weight: 1,
    },
    {
      label: 'Price Paid',
      icon: <DollarSign size={13} />,
      leftDisplay: a.acquiredFree ? 'Free' : `$${a.price.toFixed(2)}`,
      rightDisplay: b.acquiredFree ? 'Free' : `$${b.price.toFixed(2)}`,
      winner: a.acquiredFree && b.acquiredFree ? 'tie' : determineWinner(
        a.acquiredFree ? 0 : a.price,
        b.acquiredFree ? 0 : b.price,
        true
      ),
      weight: 1,
    },
    {
      label: 'Status',
      icon: <Check size={13} />,
      leftDisplay: statusLabel(a.status),
      rightDisplay: statusLabel(b.status),
      winner: determineWinner(statusScore(a.status), statusScore(b.status)),
      weight: 2,
    },
    {
      label: 'Streak',
      icon: <Flame size={13} />,
      leftDisplay: streakA > 0 ? `${streakA}d` : '—',
      rightDisplay: streakB > 0 ? `${streakB}d` : '—',
      winner: determineWinner(streakA, streakB),
      weight: 1,
    },
  ];
}

function buildVerdict(
  a: GameWithMetrics,
  b: GameWithMetrics,
  rows: CompareRow[]
): { winner: WinnerSide; leftScore: number; rightScore: number; narrative: string } {
  let ls = 0;
  let rs = 0;
  for (const r of rows) {
    if (r.winner === 'left') ls += r.weight;
    else if (r.winner === 'right') rs += r.weight;
  }

  const winner: WinnerSide = ls === rs ? 'tie' : ls > rs ? 'left' : 'right';
  const winnerGame = winner === 'left' ? a : winner === 'right' ? b : null;
  const loserGame = winner === 'left' ? b : winner === 'right' ? a : null;

  let narrative = '';
  if (!winnerGame || !loserGame) {
    narrative = 'These two are evenly matched — it comes down to personal preference.';
  } else {
    const hoursA = getTotalHours(a);
    const hoursB = getTotalHours(b);
    const ratingWinner = rows.find(r => r.label === 'Your Rating')?.winner;
    const valueWinner = rows.find(r => r.label === 'Cost / Hour')?.winner;
    const winnerSide: WinnerSide = ls > rs ? 'left' : 'right';

    if (ratingWinner === valueWinner && ratingWinner === winnerSide) {
      narrative = `${winnerGame.name} wins on both enjoyment and value — a clear champion.`;
    } else if (ratingWinner !== winnerSide && valueWinner === winnerSide) {
      const hoursWinner = winnerSide === 'left' ? hoursA : hoursB;
      const hoursLoser = winnerSide === 'left' ? hoursB : hoursA;
      if (hoursWinner >= hoursLoser) {
        narrative = `${winnerGame.name} edges ahead on value and sheer playtime, even if ${loserGame.name} scored higher.`;
      } else {
        narrative = `${winnerGame.name} wins on cost efficiency. ${loserGame.name} scored better but gave fewer hours for the money.`;
      }
    } else if (ratingWinner === winnerSide && valueWinner !== winnerSide) {
      narrative = `${winnerGame.name} takes it on enjoyment and engagement. ${loserGame.name} was cheaper per hour but less loved.`;
    } else {
      const margin = Math.abs(ls - rs);
      if (margin <= 2) {
        narrative = `A close call — ${winnerGame.name} just edges out ${loserGame.name} by a narrow margin.`;
      } else {
        narrative = `${winnerGame.name} comes out ahead across the board over ${loserGame.name}.`;
      }
    }
  }

  return { winner, leftScore: ls, rightScore: rs, narrative };
}

// ─── Sub-components ────────────────────────────────────────────────────────

function GameSelectorItem({
  game,
  onSelect,
}: {
  game: GameWithMetrics;
  onSelect: (g: GameWithMetrics) => void;
}) {
  const hours = getTotalHours(game);
  return (
    <button
      onClick={() => onSelect(game)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.07] transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.05] flex items-center justify-center">
        {game.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <Gamepad2 size={16} className="text-white/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 group-hover:text-white transition-colors truncate font-medium">{game.name}</p>
        <p className="text-xs text-white/30 truncate">
          {[game.genre, game.platform].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {game.rating > 0 && (
          <p className="text-xs font-semibold text-yellow-400">{game.rating}/10</p>
        )}
        {hours > 0 && (
          <p className="text-[10px] text-white/25">{fmtHours(hours)}</p>
        )}
      </div>
    </button>
  );
}

function GameThumbnailHero({ game, side }: { game: GameWithMetrics; side: 'left' | 'right' }) {
  return (
    <div className={clsx('flex-1 flex flex-col items-center gap-2', side === 'right' && 'items-end')}>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/[0.05] border border-white/10 shadow-lg">
        {game.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 size={24} className="text-white/20" />
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-white text-center leading-tight max-w-[100px] line-clamp-2">{game.name}</p>
      <span className={clsx(
        'text-[10px] px-2 py-0.5 rounded-full border font-medium',
        game.metrics.valueRating === 'Excellent' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
        game.metrics.valueRating === 'Good' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
        game.metrics.valueRating === 'Fair' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
        'text-red-400 border-red-400/30 bg-red-400/10'
      )}>
        {game.metrics.valueRating}
      </span>
    </div>
  );
}

function StatRow({ row, index }: { row: CompareRow; index: number }) {
  const leftWins = row.winner === 'left';
  const rightWins = row.winner === 'right';
  const isTie = row.winner === 'tie';

  return (
    <div
      className={clsx(
        'grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2.5 px-3 rounded-lg',
        index % 2 === 0 ? 'bg-white/[0.02]' : ''
      )}
    >
      {/* Left value */}
      <div className={clsx(
        'text-sm font-medium text-right transition-colors',
        leftWins ? 'text-amber-400' : isTie ? 'text-white/50' : 'text-white/30'
      )}>
        {row.leftDisplay}
        {leftWins && <span className="ml-1 text-[10px]">🏆</span>}
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center gap-0.5 min-w-[90px]">
        <div className="flex items-center gap-1 text-white/30">
          {row.icon}
          <span className="text-[10px] uppercase tracking-wider font-medium whitespace-nowrap">{row.label}</span>
        </div>
        {isTie && <Equal size={10} className="text-white/20" />}
      </div>

      {/* Right value */}
      <div className={clsx(
        'text-sm font-medium text-left transition-colors',
        rightWins ? 'text-amber-400' : isTie ? 'text-white/50' : 'text-white/30'
      )}>
        {rightWins && <span className="mr-1 text-[10px]">🏆</span>}
        {row.rightDisplay}
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export function GameCompareModal({ games, isOpen, onClose }: GameCompareModalProps) {
  const [phase, setPhase] = useState<'select-a' | 'select-b' | 'compare'>('select-a');
  const [gameA, setGameA] = useState<GameWithMetrics | null>(null);
  const [gameB, setGameB] = useState<GameWithMetrics | null>(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  const handleClose = () => {
    setPhase('select-a');
    setGameA(null);
    setGameB(null);
    setSearchA('');
    setSearchB('');
    onClose();
  };

  const filteredA = useMemo(() => {
    const q = searchA.trim().toLowerCase();
    const ownedStatuses = ['Not Started', 'In Progress', 'Completed', 'Abandoned'];
    return games
      .filter(g => ownedStatuses.includes(g.status))
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.genre ?? '').toLowerCase().includes(q));
  }, [games, searchA]);

  const filteredB = useMemo(() => {
    const q = searchB.trim().toLowerCase();
    const ownedStatuses = ['Not Started', 'In Progress', 'Completed', 'Abandoned'];
    return games
      .filter(g => ownedStatuses.includes(g.status) && g.id !== gameA?.id)
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.genre ?? '').toLowerCase().includes(q));
  }, [games, searchB, gameA]);

  const rows = useMemo<CompareRow[]>(() => {
    if (!gameA || !gameB) return [];
    return buildRows(gameA, gameB);
  }, [gameA, gameB]);

  const verdict = useMemo(() => {
    if (!gameA || !gameB || rows.length === 0) return null;
    return buildVerdict(gameA, gameB, rows);
  }, [gameA, gameB, rows]);

  if (!isOpen) return null;

  const currentSearch = phase === 'select-a' ? searchA : searchB;
  const setCurrentSearch = phase === 'select-a' ? setSearchA : setSearchB;
  const currentFiltered = phase === 'select-a' ? filteredA : filteredB;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md mx-auto bg-[#0f0f17] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            {phase !== 'select-a' && (
              <button
                onClick={() => {
                  if (phase === 'compare') { setGameB(null); setPhase('select-b'); }
                  else { setGameA(null); setPhase('select-a'); }
                }}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <Swords size={15} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">
              {phase === 'select-a' && 'Choose first game'}
              {phase === 'select-b' && `vs…  Choose second`}
              {phase === 'compare' && 'Head to Head'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Selection phases ── */}
          {(phase === 'select-a' || phase === 'select-b') && (
            <div className="flex flex-col h-full">
              {/* Selected A preview (when picking B) */}
              {phase === 'select-b' && gameA && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-purple-500/[0.08] border-b border-purple-500/[0.12]">
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-white/[0.05] shrink-0">
                    {gameA.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gameA.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 size={12} className="text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-purple-400/70 font-medium uppercase tracking-wider">Comparing</p>
                    <p className="text-xs text-white/70 font-semibold truncate">{gameA.name}</p>
                  </div>
                  <Swords size={14} className="text-purple-400/40 shrink-0 ml-auto" />
                </div>
              )}

              {/* Search */}
              <div className="px-4 py-3 shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  <input
                    type="text"
                    value={currentSearch}
                    onChange={e => setCurrentSearch(e.target.value)}
                    placeholder="Search games…"
                    autoFocus
                    className="w-full pl-8 pr-8 py-2 bg-white/[0.03] border border-white/10 text-white text-sm rounded-lg placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  {currentSearch && (
                    <button
                      onClick={() => setCurrentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Game list */}
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {currentFiltered.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/25 text-sm">No games found</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {currentFiltered.map(game => (
                      <GameSelectorItem
                        key={game.id}
                        game={game}
                        onSelect={phase === 'select-a'
                          ? (g) => { setGameA(g); setSearchA(''); setPhase('select-b'); }
                          : (g) => { setGameB(g); setSearchB(''); setPhase('compare'); }
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Comparison view ── */}
          {phase === 'compare' && gameA && gameB && verdict && (
            <div className="pb-4">
              {/* Hero strip */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4">
                <GameThumbnailHero game={gameA} side="left" />

                {/* VS + scores */}
                <div className="flex flex-col items-center gap-1 px-2 pt-2 shrink-0">
                  <div className="flex items-center gap-2 text-lg font-black">
                    <span className={clsx(
                      verdict.winner === 'left' ? 'text-amber-400' : 'text-white/20'
                    )}>{verdict.leftScore}</span>
                    <span className="text-white/10 text-sm font-normal">—</span>
                    <span className={clsx(
                      verdict.winner === 'right' ? 'text-amber-400' : 'text-white/20'
                    )}>{verdict.rightScore}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/20">
                    <Swords size={12} />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">vs</span>
                  </div>
                </div>

                <GameThumbnailHero game={gameB} side="right" />
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-white/[0.06] mb-1" />

              {/* Stats rows */}
              <div className="px-2">
                {rows.map((row, i) => (
                  <StatRow key={row.label} row={row} index={i} />
                ))}
              </div>

              {/* Verdict */}
              <div className={clsx(
                'mx-4 mt-4 rounded-xl p-4 border',
                verdict.winner === 'tie'
                  ? 'bg-white/[0.03] border-white/10'
                  : 'bg-amber-400/[0.06] border-amber-400/20'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {verdict.winner === 'tie' ? (
                    <>
                      <Equal size={14} className="text-white/40" />
                      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">It&apos;s a tie</span>
                    </>
                  ) : (
                    <>
                      <Award size={14} className="text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {verdict.winner === 'left' ? gameA.name : gameB.name} wins
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{verdict.narrative}</p>
              </div>

              {/* Restart */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => { setGameA(null); setGameB(null); setPhase('select-a'); }}
                  className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
                >
                  Compare different games
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
