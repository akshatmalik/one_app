'use client';

import { useMemo } from 'react';
import { X, Trophy, Gamepad2 } from 'lucide-react';
import { Game } from '../lib/types';
import { getGameComparison, ComparisonMetric, ComparisonWinner } from '../lib/calculations';
import clsx from 'clsx';

interface GameCompareModalProps {
  gameA: Game;
  gameB: Game;
  onClose: () => void;
}

function WinnerBadge({ winner, side }: { winner: ComparisonWinner; side: 'a' | 'b' }) {
  if (winner === 'info') return null;
  if (winner === 'tie') {
    return <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/40 font-medium">TIE</span>;
  }
  if (winner === side) {
    return <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">WIN</span>;
  }
  return <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400/60 font-medium">—</span>;
}

function BarRow({ metric, side }: { metric: ComparisonMetric; side: 'a' | 'b' }) {
  const raw = side === 'a' ? metric.rawA : metric.rawB;
  const otherRaw = side === 'a' ? metric.rawB : metric.rawA;
  const isWinner = metric.winner === side;
  const isTie = metric.winner === 'tie';
  const isInfo = metric.winner === 'info';

  // Compute bar fill fraction
  let fill = 0;
  if (!isInfo && raw >= 0 && otherRaw >= 0) {
    const maxVal = Math.max(raw, otherRaw);
    if (maxVal > 0) {
      fill = metric.higherIsBetter
        ? raw / maxVal
        : otherRaw > 0 ? otherRaw / (raw + otherRaw) : (raw > 0 ? 0.2 : 0.5);
    } else {
      fill = 0.5;
    }
    fill = Math.max(0.05, Math.min(1, fill));
  }

  const barColor = isWinner
    ? 'bg-emerald-500/50'
    : isTie
    ? 'bg-white/20'
    : isInfo
    ? 'bg-white/10'
    : 'bg-white/10';

  return (
    <div className={clsx('h-1.5 rounded-full bg-white/5 overflow-hidden', side === 'b' && 'scale-x-[-1]')}>
      {fill > 0 && (
        <div
          className={clsx('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${fill * 100}%` }}
        />
      )}
    </div>
  );
}

function GamePortrait({ game, side, isWinner }: { game: Game; side: 'a' | 'b'; isWinner: boolean }) {
  return (
    <div className={clsx('flex-1 flex flex-col items-center gap-2 relative', side === 'b' && 'items-end')}>
      {/* Thumbnail */}
      <div className={clsx(
        'w-20 h-20 rounded-xl overflow-hidden border-2 transition-all',
        isWinner ? 'border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.3)]' : 'border-white/10',
      )}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Gamepad2 size={24} className="text-white/20" />
          </div>
        )}
      </div>

      {isWinner && (
        <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg z-10">
          <Trophy size={10} className="text-black" />
        </div>
      )}

      <div className={clsx('text-center', side === 'b' && 'text-right')}>
        <p className="text-xs font-bold text-white/90 leading-tight line-clamp-2">{game.name}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{game.status}</p>
        {game.platform && (
          <p className="text-[10px] text-white/30">{game.platform}</p>
        )}
      </div>
    </div>
  );
}

export function GameCompareModal({ gameA, gameB, onClose }: GameCompareModalProps) {
  const comparison = useMemo(() => getGameComparison(gameA, gameB), [gameA, gameB]);

  const winnerGame = comparison.overallWinner === 'a' ? gameA : comparison.overallWinner === 'b' ? gameB : null;

  const valueColorA = (metric: ComparisonMetric) => {
    if (metric.winner === 'a') return 'text-emerald-400 font-bold';
    if (metric.winner === 'tie') return 'text-white/60';
    if (metric.winner === 'b') return 'text-white/35';
    return 'text-white/50';
  };

  const valueColorB = (metric: ComparisonMetric) => {
    if (metric.winner === 'b') return 'text-emerald-400 font-bold';
    if (metric.winner === 'tie') return 'text-white/60';
    if (metric.winner === 'a') return 'text-white/35';
    return 'text-white/50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md mx-auto bg-[#0e0e16] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                <path d="M16 3h5v5M4 20 20.2 3.8M21 16v5h-5M15 15l5.1 5.1M4 4l5 5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white/80">Head-to-Head</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Game portraits */}
          <div className="px-4 pt-4 pb-3 flex items-start gap-3">
            <GamePortrait game={gameA} side="a" isWinner={comparison.overallWinner === 'a'} />

            {/* VS divider */}
            <div className="flex flex-col items-center gap-1 pt-4 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-white/40">VS</span>
              </div>
            </div>

            <GamePortrait game={gameB} side="b" isWinner={comparison.overallWinner === 'b'} />
          </div>

          {/* Overall winner banner */}
          <div className={clsx(
            'mx-4 mb-4 px-3 py-2.5 rounded-xl text-center',
            comparison.overallWinner === 'tie'
              ? 'bg-white/5 border border-white/10'
              : 'bg-amber-500/10 border border-amber-500/20',
          )}>
            {comparison.overallWinner === 'tie' ? (
              <p className="text-xs text-white/50">It&apos;s a tie — both games are equally matched</p>
            ) : (
              <>
                <p className="text-[10px] text-amber-400/60 font-medium uppercase tracking-wider mb-0.5">Winner</p>
                <p className="text-sm font-bold text-amber-300">{winnerGame?.name}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{comparison.verdict}</p>
              </>
            )}
          </div>

          {/* Score summary */}
          <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-xl p-2.5 text-center">
              <p className={clsx('text-xl font-black tabular-nums', comparison.overallWinner === 'a' ? 'text-emerald-400' : 'text-white/40')}>{comparison.winsA}</p>
              <p className="text-[9px] text-white/30 font-medium mt-0.5">wins</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
              <p className="text-[9px] text-white/20 font-medium uppercase tracking-wider">Score</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 text-center">
              <p className={clsx('text-xl font-black tabular-nums', comparison.overallWinner === 'b' ? 'text-emerald-400' : 'text-white/40')}>{comparison.winsB}</p>
              <p className="text-[9px] text-white/30 font-medium mt-0.5">wins</p>
            </div>
          </div>

          {/* Metric rows */}
          <div className="px-4 pb-5 space-y-1.5">
            <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider mb-2">Stat Breakdown</p>
            {comparison.metrics.map(metric => (
              <div key={metric.key} className="bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.04]">
                {/* Labels row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <WinnerBadge winner={metric.winner} side="a" />
                    <span className={clsx('text-xs tabular-nums', valueColorA(metric))}>{metric.displayA}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/30">{metric.emoji}</span>
                    <span className="text-[10px] text-white/40 font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('text-xs tabular-nums', valueColorB(metric))}>{metric.displayB}</span>
                    <WinnerBadge winner={metric.winner} side="b" />
                  </div>
                </div>

                {/* Dual progress bars */}
                {metric.winner !== 'info' && metric.rawA >= 0 && metric.rawB >= 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    <BarRow metric={metric} side="a" />
                    <BarRow metric={metric} side="b" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Edge cards */}
          {(comparison.primaryEdgeA || comparison.primaryEdgeB) && (
            <div className="px-4 pb-5 grid grid-cols-2 gap-2">
              {comparison.primaryEdgeA && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2.5">
                  <p className="text-[9px] text-white/30 font-medium uppercase tracking-wider mb-1 truncate">{gameA.name}</p>
                  <p className="text-[11px] text-emerald-300/80">{comparison.primaryEdgeA}</p>
                </div>
              )}
              {comparison.primaryEdgeB && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2.5">
                  <p className="text-[9px] text-white/30 font-medium uppercase tracking-wider mb-1 truncate">{gameB.name}</p>
                  <p className="text-[11px] text-emerald-300/80">{comparison.primaryEdgeB}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
