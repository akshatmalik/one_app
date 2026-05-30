'use client';

import { useState, useMemo } from 'react';
import { X, Search, Star, Clock, DollarSign, Zap, TrendingUp, Gamepad2, ArrowLeftRight, CheckCircle2, Minus } from 'lucide-react';
import { GameWithMetrics } from '../hooks/useAnalytics';
import { Game } from '../lib/types';
import { getRelationshipStatus, getCardRarity, getROIRating } from '../lib/calculations';
import { RatingStars } from './RatingStars';
import clsx from 'clsx';

type Winner = 'left' | 'right' | 'tie';

interface MetricRow {
  id: string;
  label: string;
  leftVal: string;
  rightVal: string;
  leftRaw: number;
  rightRaw: number;
  winner: Winner;
  icon: React.ReactNode;
}

function pickWinner(left: number, right: number, lowerBetter = false): Winner {
  if (!isFinite(left) && !isFinite(right)) return 'tie';
  if (!isFinite(left) || isNaN(left)) return 'right';
  if (!isFinite(right) || isNaN(right)) return 'left';
  const eps = Math.max(0.005, Math.abs(left + right) * 0.005);
  if (Math.abs(left - right) < eps) return 'tie';
  return lowerBetter ? (left < right ? 'left' : 'right') : (left > right ? 'left' : 'right');
}

function rarityColor(tier: string): string {
  if (tier === 'legendary') return '#fbbf24';
  if (tier === 'epic')      return '#a855f7';
  if (tier === 'rare')      return '#3b82f6';
  if (tier === 'uncommon')  return '#22c55e';
  return '#ffffff40';
}

const STATUS_EMOJI: Record<string, string> = {
  'Completed':   '✅',
  'In Progress': '▶️',
  'Not Started': '📦',
  'Abandoned':   '💀',
  'Wishlist':    '🔖',
};

// ── Standalone slot components (outside main fn to prevent remount on rerender) ──

interface GameSlotPickerProps {
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  filtered: GameWithMetrics[];
  onSelect: (g: GameWithMetrics) => void;
  autoFocusInput: boolean;
}

function GameSlotPicker({ placeholder, query, onQueryChange, filtered, onSelect, autoFocusInput }: GameSlotPickerProps) {
  return (
    <div className="relative">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          type="text"
          autoFocus={autoFocusInput}
          placeholder={placeholder}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2.5 bg-white/[0.04] border border-white/10 text-white text-xs rounded-xl placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 transition-all"
        />
      </div>
      <div className="absolute top-full left-0 right-0 mt-1 bg-[#13131e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 max-h-48 overflow-y-auto">
        {filtered.slice(0, 25).map(g => (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
          >
            {g.thumbnail ? (
              <img src={g.thumbnail} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                <Gamepad2 size={12} className="text-white/20" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/80 truncate">{g.name}</p>
              <p className="text-[10px] text-white/30">{g.genre ?? g.platform ?? g.status}</p>
            </div>
            {g.rating > 0 && (
              <span className="text-[10px] text-white/40 flex-shrink-0">{g.rating}/10</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-white/30 text-center">No games found</div>
        )}
      </div>
    </div>
  );
}

interface GameSlotSelectedProps {
  game: GameWithMetrics;
  rel: ReturnType<typeof getRelationshipStatus> | null;
  rar: ReturnType<typeof getCardRarity> | null;
  onClear: () => void;
}

function GameSlotSelected({ game, rel, rar, onClear }: GameSlotSelectedProps) {
  return (
    <button
      onClick={onClear}
      className={clsx(
        'w-full text-left rounded-xl overflow-hidden border transition-all hover:opacity-90 active:scale-[0.98]',
        rar?.borderClass ?? 'border-white/10',
      )}
      title="Click to change"
    >
      {game.thumbnail ? (
        <div className="relative h-20 overflow-hidden">
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {rar && rar.tier !== 'common' && (
            <div
              className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 bg-black/70 rounded font-bold uppercase tracking-wide"
              style={{ color: rarityColor(rar.tier) }}
            >
              {rar.label}
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 right-2">
            <p className="text-xs font-bold text-white truncate leading-tight">{game.name}</p>
          </div>
        </div>
      ) : (
        <div className="h-14 bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center">
          <Gamepad2 size={22} className="text-white/20" />
        </div>
      )}
      <div className="px-2.5 py-2 space-y-1">
        {!game.thumbnail && (
          <p className="text-xs font-semibold text-white/80 truncate">{game.name}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {rel && (
            <span className="text-[10px] font-medium" style={{ color: rel.color }}>
              {rel.label}
            </span>
          )}
          <span className="text-[10px] text-white/25">
            {STATUS_EMOJI[game.status] ?? ''} {game.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/35">
          <span>{game.totalHours.toFixed(1)}h</span>
          {game.rating > 0 && <span>· {game.rating}/10</span>}
          {!game.acquiredFree && game.price > 0 && <span>· ${game.price}</span>}
        </div>
      </div>
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface GameCompareModalProps {
  games: GameWithMetrics[];
  allGames: Game[];
  onClose: () => void;
}

export function GameCompareModal({ games, allGames, onClose }: GameCompareModalProps) {
  const [leftId,    setLeftId]    = useState<string | null>(null);
  const [rightId,   setRightId]   = useState<string | null>(null);
  const [leftQ,     setLeftQ]     = useState('');
  const [rightQ,    setRightQ]    = useState('');
  const [leftOpen,  setLeftOpen]  = useState(true);
  const [rightOpen, setRightOpen] = useState(false);

  const leftGame  = useMemo(() => games.find(g => g.id === leftId)  ?? null, [games, leftId]);
  const rightGame = useMemo(() => games.find(g => g.id === rightId) ?? null, [games, rightId]);

  const leftRel  = useMemo(() => leftGame  ? getRelationshipStatus(leftGame,  allGames) : null, [leftGame,  allGames]);
  const rightRel = useMemo(() => rightGame ? getRelationshipStatus(rightGame, allGames) : null, [rightGame, allGames]);
  const leftRar  = useMemo(() => leftGame  ? getCardRarity(leftGame)  : null, [leftGame]);
  const rightRar = useMemo(() => rightGame ? getCardRarity(rightGame) : null, [rightGame]);

  const filteredLeft = useMemo(() => {
    const q = leftQ.toLowerCase().trim();
    return games.filter(g =>
      g.id !== rightId &&
      (!q || g.name.toLowerCase().includes(q) || (g.genre ?? '').toLowerCase().includes(q) || (g.platform ?? '').toLowerCase().includes(q))
    );
  }, [games, leftQ, rightId]);

  const filteredRight = useMemo(() => {
    const q = rightQ.toLowerCase().trim();
    return games.filter(g =>
      g.id !== leftId &&
      (!q || g.name.toLowerCase().includes(q) || (g.genre ?? '').toLowerCase().includes(q) || (g.platform ?? '').toLowerCase().includes(q))
    );
  }, [games, rightQ, leftId]);

  const metrics = useMemo((): MetricRow[] | null => {
    if (!leftGame || !rightGame) return null;

    const lH   = leftGame.totalHours;
    const rH   = rightGame.totalHours;
    const lCPH = lH > 0 ? leftGame.metrics.costPerHour  : Infinity;
    const rCPH = rH > 0 ? rightGame.metrics.costPerHour : Infinity;
    const lSes = (leftGame.playLogs  ?? []).length;
    const rSes = (rightGame.playLogs ?? []).length;
    const lROI = leftGame.metrics.roi;
    const rROI = rightGame.metrics.roi;
    const lPri = leftGame.acquiredFree  ? 0 : leftGame.price;
    const rPri = rightGame.acquiredFree ? 0 : rightGame.price;

    return [
      {
        id: 'rating',
        label: 'Rating',
        leftVal:  leftGame.rating  > 0 ? `${leftGame.rating}/10`  : '—',
        rightVal: rightGame.rating > 0 ? `${rightGame.rating}/10` : '—',
        leftRaw:  leftGame.rating,
        rightRaw: rightGame.rating,
        winner:   pickWinner(leftGame.rating, rightGame.rating),
        icon:     <Star size={11} />,
      },
      {
        id: 'hours',
        label: 'Hours',
        leftVal:  `${lH.toFixed(1)}h`,
        rightVal: `${rH.toFixed(1)}h`,
        leftRaw:  lH,
        rightRaw: rH,
        winner:   pickWinner(lH, rH),
        icon:     <Clock size={11} />,
      },
      {
        id: 'cph',
        label: '$/hr',
        leftVal:  isFinite(lCPH) ? `$${lCPH.toFixed(2)}` : '—',
        rightVal: isFinite(rCPH) ? `$${rCPH.toFixed(2)}` : '—',
        leftRaw:  isFinite(lCPH) ? lCPH : 9999,
        rightRaw: isFinite(rCPH) ? rCPH : 9999,
        winner:   pickWinner(isFinite(lCPH) ? lCPH : 9999, isFinite(rCPH) ? rCPH : 9999, true),
        icon:     <DollarSign size={11} />,
      },
      {
        id: 'roi',
        label: 'ROI',
        leftVal:  isFinite(lROI) ? lROI.toFixed(1) : '—',
        rightVal: isFinite(rROI) ? rROI.toFixed(1) : '—',
        leftRaw:  lROI,
        rightRaw: rROI,
        winner:   pickWinner(lROI, rROI),
        icon:     <TrendingUp size={11} />,
      },
      {
        id: 'price',
        label: 'Price',
        leftVal:  leftGame.acquiredFree  ? 'Free' : `$${lPri.toFixed(0)}`,
        rightVal: rightGame.acquiredFree ? 'Free' : `$${rPri.toFixed(0)}`,
        leftRaw:  lPri,
        rightRaw: rPri,
        winner:   pickWinner(lPri, rPri, true),
        icon:     <DollarSign size={11} />,
      },
      {
        id: 'sessions',
        label: 'Sessions',
        leftVal:  String(lSes),
        rightVal: String(rSes),
        leftRaw:  lSes,
        rightRaw: rSes,
        winner:   pickWinner(lSes, rSes),
        icon:     <Zap size={11} />,
      },
    ];
  }, [leftGame, rightGame]);

  const verdict = useMemo(() => {
    if (!metrics || !leftGame || !rightGame) return null;

    let lW = 0, rW = 0;
    for (const m of metrics) {
      if (m.winner === 'left')  lW++;
      if (m.winner === 'right') rW++;
    }

    const lCPH = leftGame.totalHours  > 0 ? leftGame.metrics.costPerHour  : null;
    const rCPH = rightGame.totalHours > 0 ? rightGame.metrics.costPerHour : null;

    let insight = '';
    if (lW === rW) {
      insight = `${leftGame.name} and ${rightGame.name} are neck-and-neck — each wins ${lW} of ${metrics.length} categories. Too close to call.`;
    } else {
      const winnerGame = lW > rW ? leftGame  : rightGame;
      const loserGame  = lW > rW ? rightGame : leftGame;
      const winScore   = lW > rW ? lW : rW;
      const highlights: string[] = [];

      if (winnerGame.rating > loserGame.rating) {
        highlights.push(`rated ${winnerGame.rating}/10 vs ${loserGame.rating}/10`);
      }

      const wCPH = winnerGame.totalHours > 0 ? winnerGame.metrics.costPerHour : null;
      const lCPHOther = loserGame.totalHours > 0 ? loserGame.metrics.costPerHour : null;
      if (wCPH !== null && lCPHOther !== null && lCPHOther > wCPH) {
        highlights.push(`$${(lCPHOther - wCPH).toFixed(2)}/hr cheaper`);
      }

      if (winnerGame.totalHours > loserGame.totalHours * 1.2 && winnerGame.totalHours - loserGame.totalHours >= 2) {
        highlights.push(`${(winnerGame.totalHours - loserGame.totalHours).toFixed(0)}h more playtime`);
      }

      insight = `${winnerGame.name} wins ${winScore}/${metrics.length} categories`;
      if (highlights.length > 0) {
        insight += ` — ${highlights.slice(0, 2).join(' and ')}.`;
      } else {
        insight += '.';
      }
    }

    let extra = '';
    if (lCPH !== null && rCPH !== null && Math.abs(lCPH - rCPH) > 0.1) {
      const cheapCPH = Math.min(lCPH, rCPH);
      const expCPH   = Math.max(lCPH, rCPH);
      const ratio    = expCPH / cheapCPH;
      const cheapName = lCPH < rCPH ? leftGame.name : rightGame.name;
      extra = `${cheapName} is ${ratio.toFixed(1)}× better value per hour.`;
    } else if (lCPH === null && rCPH !== null) {
      extra = `${rightGame.name} has a tracked $/hr — ${leftGame.name} has no play logs yet.`;
    } else if (lCPH !== null && rCPH === null) {
      extra = `${leftGame.name} has a tracked $/hr — ${rightGame.name} has no play logs yet.`;
    }

    return { lW, rW, total: metrics.length, insight, extra, tie: lW === rW };
  }, [metrics, leftGame, rightGame]);

  const selectLeft = (g: GameWithMetrics) => {
    setLeftId(g.id);
    setLeftOpen(false);
    setLeftQ('');
    if (!rightId) setRightOpen(true);
  };

  const selectRight = (g: GameWithMetrics) => {
    setRightId(g.id);
    setRightOpen(false);
    setRightQ('');
  };

  const winnerTextColor = (side: 'left' | 'right', w: Winner) => {
    if (w === 'tie') return 'text-white/35';
    return w === side ? 'text-emerald-400' : 'text-white/25';
  };

  const winnerBg = (side: 'left' | 'right', w: Winner) =>
    w === side ? 'bg-emerald-500/[0.07]' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#0d0d14] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className="text-purple-400" />
            <span className="text-sm font-semibold text-white tracking-tight">Head-to-Head</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-4">

            {/* Two picker/selected slots */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left slot */}
              <div>
                {leftGame && !leftOpen ? (
                  <GameSlotSelected
                    game={leftGame}
                    rel={leftRel}
                    rar={leftRar}
                    onClear={() => { setLeftId(null); setLeftOpen(true); }}
                  />
                ) : (
                  <GameSlotPicker
                    placeholder="Game A…"
                    query={leftQ}
                    onQueryChange={setLeftQ}
                    filtered={filteredLeft}
                    onSelect={selectLeft}
                    autoFocusInput={!leftId}
                  />
                )}
              </div>

              {/* Right slot */}
              <div>
                {rightGame && !rightOpen ? (
                  <GameSlotSelected
                    game={rightGame}
                    rel={rightRel}
                    rar={rightRar}
                    onClear={() => { setRightId(null); setRightOpen(true); }}
                  />
                ) : (
                  <GameSlotPicker
                    placeholder="Game B…"
                    query={rightQ}
                    onQueryChange={setRightQ}
                    filtered={filteredRight}
                    onSelect={selectRight}
                    autoFocusInput={!!leftId && !rightId}
                  />
                )}
              </div>
            </div>

            {/* Comparison section */}
            {metrics && leftGame && rightGame ? (
              <div className="space-y-3">

                {/* Score bar */}
                {verdict && (
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-xs font-bold tabular-nums w-4 text-right',
                      !verdict.tie && verdict.lW > verdict.rW ? 'text-purple-400' : 'text-white/30'
                    )}>
                      {verdict.lW}
                    </span>
                    <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-white/5 gap-px">
                      {verdict.lW > 0 && (
                        <div
                          className="bg-purple-500 rounded-l-full transition-all duration-500"
                          style={{ width: `${(verdict.lW / verdict.total) * 100}%` }}
                        />
                      )}
                      <div className="flex-1" />
                      {verdict.rW > 0 && (
                        <div
                          className="bg-blue-500 rounded-r-full transition-all duration-500"
                          style={{ width: `${(verdict.rW / verdict.total) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className={clsx(
                      'text-xs font-bold tabular-nums w-4 text-left',
                      !verdict.tie && verdict.rW > verdict.lW ? 'text-blue-400' : 'text-white/30'
                    )}>
                      {verdict.rW}
                    </span>
                  </div>
                )}

                {/* Metric rows */}
                <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                  {metrics.map((m, i) => (
                    <div
                      key={m.id}
                      className={clsx('flex items-stretch', i > 0 && 'border-t border-white/[0.04]')}
                    >
                      {/* Left value */}
                      <div className={clsx(
                        'flex-1 flex items-center justify-end px-3 py-3 gap-1.5 transition-colors',
                        winnerBg('left', m.winner)
                      )}>
                        {m.winner === 'left' && (
                          <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />
                        )}
                        <span className={clsx('text-xs font-semibold tabular-nums', winnerTextColor('left', m.winner))}>
                          {m.leftVal}
                        </span>
                      </div>

                      {/* Center label */}
                      <div className="w-[88px] flex items-center justify-center gap-1 px-1 py-3 flex-shrink-0 border-x border-white/[0.04] bg-white/[0.01]">
                        <span className="text-white/20">{m.icon}</span>
                        <span className="text-[10px] text-white/28 text-center leading-tight">{m.label}</span>
                        {m.winner === 'tie' && <Minus size={8} className="text-white/15" />}
                      </div>

                      {/* Right value */}
                      <div className={clsx(
                        'flex-1 flex items-center justify-start px-3 py-3 gap-1.5 transition-colors',
                        winnerBg('right', m.winner)
                      )}>
                        <span className={clsx('text-xs font-semibold tabular-nums', winnerTextColor('right', m.winner))}>
                          {m.rightVal}
                        </span>
                        {m.winner === 'right' && (
                          <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verdict */}
                {verdict && (
                  <div className={clsx(
                    'rounded-xl p-3.5 border',
                    verdict.tie
                      ? 'bg-white/[0.02] border-white/[0.06]'
                      : verdict.lW > verdict.rW
                        ? 'bg-purple-500/[0.05] border-purple-500/20'
                        : 'bg-blue-500/[0.05] border-blue-500/20'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">Verdict</span>
                      {!verdict.tie ? (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            color:           verdict.lW > verdict.rW ? '#a855f7' : '#3b82f6',
                            backgroundColor: verdict.lW > verdict.rW ? 'rgba(168,85,247,0.12)' : 'rgba(59,130,246,0.12)',
                          }}
                        >
                          {verdict.lW > verdict.rW ? leftGame.name : rightGame.name} wins
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white/40 bg-white/5">
                          Draw
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/55 leading-relaxed">{verdict.insight}</p>
                    {verdict.extra && (
                      <p className="text-[11px] text-white/30 leading-relaxed mt-1.5 italic">{verdict.extra}</p>
                    )}
                  </div>
                )}

                {/* Value rating cards */}
                <div className="grid grid-cols-2 gap-2">
                  {([leftGame, rightGame] as const).map(game => {
                    const vr = game.metrics.valueRating;
                    const vColor = vr === 'Excellent' ? '#10b981'
                      : vr === 'Good' ? '#3b82f6'
                      : vr === 'Fair' ? '#eab308'
                      : '#ef4444';
                    return (
                      <div key={game.id} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <p className="text-[10px] text-white/30 mb-1.5 truncate">{game.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ color: vColor, backgroundColor: `${vColor}18` }}
                          >
                            {vr}
                          </span>
                          <span className="text-[10px] text-white/25">
                            ROI {getROIRating(game.metrics.roi)}
                          </span>
                          {game.rating > 0 && <RatingStars rating={game.rating} size={8} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-5xl mb-4 opacity-20 select-none">⚔️</div>
                <p className="text-sm font-medium text-white/30">Pick two games to compare</p>
                <p className="text-xs text-white/18 mt-1">Rating · Hours · Cost/hr · ROI and more</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
