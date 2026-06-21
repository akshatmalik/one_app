'use client';

import { useMemo, useState } from 'react';
import { X, Users, Copy, Check, Trophy, ClipboardPaste, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  VersusSnapshot,
  buildVersusSnapshot,
  encodeVersusCode,
  decodeVersusCode,
} from '../lib/versus-codes';
import { formatCurrency, formatCostPerHour, formatHours, formatPercent } from '../lib/format';

interface Props {
  games: Game[];
  onClose: () => void;
}

interface StatRow {
  label: string;
  meDisplay: string;
  rivalDisplay: string;
  meNum: number;
  rivalNum: number;
  lowerBetter: boolean;
}

function buildStats(me: VersusSnapshot, rival: VersusSnapshot): StatRow[] {
  return [
    {
      label: 'Total Hours',
      meDisplay: formatHours(me.totalHours),
      rivalDisplay: formatHours(rival.totalHours),
      meNum: me.totalHours,
      rivalNum: rival.totalHours,
      lowerBetter: false,
    },
    {
      label: 'Library Size',
      meDisplay: String(me.ownedCount),
      rivalDisplay: String(rival.ownedCount),
      meNum: me.ownedCount,
      rivalNum: rival.ownedCount,
      lowerBetter: false,
    },
    {
      label: 'Total Spent',
      meDisplay: formatCurrency(me.totalSpent),
      rivalDisplay: formatCurrency(rival.totalSpent),
      meNum: me.totalSpent,
      rivalNum: rival.totalSpent,
      lowerBetter: false,
    },
    {
      label: 'Cost / Hour',
      meDisplay: formatCostPerHour(me.avgCostPerHour),
      rivalDisplay: formatCostPerHour(rival.avgCostPerHour),
      meNum: me.avgCostPerHour,
      rivalNum: rival.avgCostPerHour,
      lowerBetter: true,
    },
    {
      label: 'Avg Rating',
      meDisplay: me.avgRating > 0 ? `${me.avgRating.toFixed(1)}/10` : '—',
      rivalDisplay: rival.avgRating > 0 ? `${rival.avgRating.toFixed(1)}/10` : '—',
      meNum: me.avgRating,
      rivalNum: rival.avgRating,
      lowerBetter: false,
    },
    {
      label: 'Completion Rate',
      meDisplay: formatPercent(me.completionRate * 100),
      rivalDisplay: formatPercent(rival.completionRate * 100),
      meNum: me.completionRate,
      rivalNum: rival.completionRate,
      lowerBetter: false,
    },
    {
      label: 'Credit Score',
      meDisplay: String(me.creditScore),
      rivalDisplay: String(rival.creditScore),
      meNum: me.creditScore,
      rivalNum: rival.creditScore,
      lowerBetter: false,
    },
  ];
}

function rowWinner(row: StatRow): 'me' | 'rival' | 'tie' {
  if (row.meNum === row.rivalNum) return 'tie';
  if (row.lowerBetter) return row.meNum < row.rivalNum ? 'me' : 'rival';
  return row.meNum > row.rivalNum ? 'me' : 'rival';
}

export function VersusModal({ games, onClose }: Props) {
  const [name, setName] = useState('Player');
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const [rival, setRival] = useState<VersusSnapshot | null>(null);

  const mySnapshot = useMemo(() => buildVersusSnapshot(games, name), [games, name]);
  const myCode = useMemo(() => encodeVersusCode(mySnapshot), [mySnapshot]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleCompare() {
    const decoded = decodeVersusCode(pasteValue);
    if (!decoded) {
      setPasteError(true);
      return;
    }
    setPasteError(false);
    setRival(decoded);
  }

  const stats = useMemo(() => rival ? buildStats(mySnapshot, rival) : [], [mySnapshot, rival]);

  const { winsMe, winsRival, contested } = useMemo(() => {
    let me = 0, riv = 0, total = 0;
    for (const row of stats) {
      const w = rowWinner(row);
      if (w !== 'tie') { total++; if (w === 'me') me++; else riv++; }
    }
    return { winsMe: me, winsRival: riv, contested: total };
  }, [stats]);

  const overall = winsMe > winsRival ? 'me' : winsRival > winsMe ? 'rival' : 'tie';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Rival Check</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {!rival ? (
            /* ── Setup: share my code + paste a friend's ── */
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                Compare libraries with a friend — no accounts, no servers. Share your code,
                paste theirs back, see who wins.
              </p>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={24}
                  placeholder="Player"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">Your code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-[11px] text-white/60 bg-black/30 rounded-lg px-2.5 py-2 truncate font-mono">
                    {myCode || '—'}
                  </code>
                  <button
                    onClick={handleCopy}
                    disabled={!myCode}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0',
                      copied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/70 hover:bg-white/15'
                    )}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Paste a friend&apos;s code
                </label>
                <textarea
                  value={pasteValue}
                  onChange={e => { setPasteValue(e.target.value); setPasteError(false); }}
                  placeholder="Paste their Rival Check code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    pasteError ? 'border-red-500/50' : 'border-white/10 focus:border-emerald-500/50'
                  )}
                />
                {pasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That doesn&apos;t look like a valid Rival Check code. Ask your friend to copy theirs again.
                  </p>
                )}
                <button
                  onClick={handleCompare}
                  disabled={!pasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-emerald-500/15 transition-colors"
                >
                  <ClipboardPaste size={14} /> Compare
                </button>
              </div>
            </div>
          ) : (
            /* ── Comparison view ── */
            <div className="p-4 space-y-5 pb-8">
              {/* Names row */}
              <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2">
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/90 truncate">{mySnapshot.name}</p>
                  <p className="text-[10px] text-white/30">You</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowLeftRight size={14} className="text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/90 truncate">{rival.name}</p>
                  <p className="text-[10px] text-white/30">Rival</p>
                </div>
              </div>

              {/* Winner banner */}
              {contested > 0 && (
                <div className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold',
                  overall === 'me' ? 'bg-emerald-500/15 text-emerald-300' :
                  overall === 'rival' ? 'bg-blue-500/15 text-blue-300' :
                  'bg-white/5 text-white/40'
                )}>
                  {overall === 'tie' ? (
                    <>🤝 Dead heat</>
                  ) : (
                    <>
                      <Trophy size={14} />
                      {overall === 'me' ? mySnapshot.name : rival.name} wins {Math.max(winsMe, winsRival)}/{contested} categories
                    </>
                  )}
                </div>
              )}

              {/* Stats table */}
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-[auto_1fr_1fr] bg-white/[0.025]">
                  <div className="w-28 px-3 py-2 text-[9px] text-white/25 font-bold uppercase tracking-wider">Stat</div>
                  <div className="px-3 py-2 text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {mySnapshot.name}
                  </div>
                  <div className="px-3 py-2 text-[9px] text-blue-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {rival.name}
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
                        winner === 'me' ? 'text-emerald-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.meDisplay}
                        {winner === 'me' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                      <div className={clsx(
                        'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                        winner === 'rival' ? 'text-blue-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.rivalDisplay}
                        {winner === 'rival' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Highlights — not head-to-head, just fun context */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{mySnapshot.name}&apos;s top game</p>
                  <p className="text-xs font-bold text-emerald-300 leading-tight truncate">
                    {mySnapshot.topGame ? mySnapshot.topGame.name : '—'}
                  </p>
                  {mySnapshot.topGame && (
                    <p className="text-[9px] text-white/25 mt-1">{formatHours(mySnapshot.topGame.hours)}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{rival.name}&apos;s top game</p>
                  <p className="text-xs font-bold text-blue-300 leading-tight truncate">
                    {rival.topGame ? rival.topGame.name : '—'}
                  </p>
                  {rival.topGame && (
                    <p className="text-[9px] text-white/25 mt-1">{formatHours(rival.topGame.hours)}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setRival(null); setPasteValue(''); }}
                className="w-full py-2.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Check a different rival
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
