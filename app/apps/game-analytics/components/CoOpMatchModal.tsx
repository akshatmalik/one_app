'use client';

import { useCallback, useMemo, useState } from 'react';
import { X, Gamepad2, Copy, Check, ClipboardPaste, Dices, Sparkles, Users2 } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  CoOpLibrarySnapshot,
  CoOpMatch,
  buildCoOpSnapshot,
  encodeCoOpCode,
  decodeCoOpCode,
  computeCoOpMatches,
  getTonightCandidates,
} from '../lib/coop-match';

interface Props {
  games: Game[];
  onClose: () => void;
}

const RELATION_LABEL: Record<CoOpMatch['relation'], { text: string; className: string }> = {
  'both-unplayed': { text: 'Fresh start for both', className: 'bg-emerald-500/15 text-emerald-300' },
  'both-playing': { text: 'You’re both mid-game', className: 'bg-blue-500/15 text-blue-300' },
  'mismatched-progress': { text: 'Different stages', className: 'bg-amber-500/15 text-amber-300' },
  'one-finished': { text: 'One of you finished it', className: 'bg-white/10 text-white/40' },
  'both-finished': { text: 'Already done', className: 'bg-white/5 text-white/25' },
};

export function CoOpMatchModal({ games, onClose }: Props) {
  const [name, setName] = useState('Player');
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const [friend, setFriend] = useState<CoOpLibrarySnapshot | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [spinPick, setSpinPick] = useState<CoOpMatch | null>(null);

  const mySnapshot = useMemo(() => buildCoOpSnapshot(games, name), [games, name]);
  const myCode = useMemo(() => encodeCoOpCode(mySnapshot), [mySnapshot]);

  const result = useMemo(() => (friend ? computeCoOpMatches(games, friend) : null), [games, friend]);
  const tonightPool = useMemo(() => (result ? getTonightCandidates(result.matches) : []), [result]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleFindMatches() {
    const decoded = decodeCoOpCode(pasteValue);
    if (!decoded) {
      setPasteError(true);
      return;
    }
    setPasteError(false);
    setFriend(decoded);
    setSpinPick(null);
  }

  const handleSpin = useCallback(() => {
    if (tonightPool.length === 0) return;
    setSpinning(true);
    setSpinPick(null);
    let count = 0;
    const interval = setInterval(() => {
      setSpinPick(tonightPool[Math.floor(Math.random() * tonightPool.length)]);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setSpinning(false);
        setSpinPick(tonightPool[Math.floor(Math.random() * tonightPool.length)]);
      }
    }, 120);
  }, [tonightPool]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Users2 size={15} className="text-orange-400" />
            <h2 className="text-sm font-bold text-white">Game Night</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {!friend ? (
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                Find what you and a friend can play together tonight. Share your code, paste theirs back —
                this one shares your actual game list (not just stats), so you can both opt in knowingly.
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
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">
                  Your Game Night code ({mySnapshot.games.length} games)
                </p>
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
                  placeholder="Paste their Game Night code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    pasteError ? 'border-red-500/50' : 'border-white/10 focus:border-orange-500/50'
                  )}
                />
                {pasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That doesn&apos;t look like a valid Game Night code. Ask your friend to copy theirs again.
                  </p>
                )}
                <button
                  onClick={handleFindMatches}
                  disabled={!pasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orange-500/15 text-orange-300 text-sm font-semibold hover:bg-orange-500/20 disabled:opacity-30 disabled:hover:bg-orange-500/15 transition-colors"
                >
                  <ClipboardPaste size={14} /> Find What We Can Play
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-5 pb-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white/90">{mySnapshot.name} &amp; {friend.name}</p>
                  <p className="text-[10px] text-white/30">
                    {result?.matches.length ?? 0} shared game{result?.matches.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-xl font-bold text-orange-300 tabular-nums">{result?.compatibilityScore ?? 0}%</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider">Compatibility</p>
                </div>
              </div>

              {result && result.sharedGenres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.sharedGenres.slice(0, 6).map(g => (
                    <span key={g.genre} className="px-2 py-1 rounded-full bg-white/5 text-[10px] text-white/50">
                      {g.genre} · {g.count}
                    </span>
                  ))}
                </div>
              )}

              {/* Spin to pick tonight's game */}
              <div className={clsx(
                'rounded-xl border text-center transition-all p-5 flex flex-col items-center justify-center min-h-[140px]',
                spinPick ? 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-orange-500/30' : 'bg-white/[0.02] border-white/5',
                spinning && 'animate-pulse'
              )}>
                {spinPick ? (
                  <>
                    <div className={clsx('text-base font-bold text-white transition-all', spinning && 'blur-[1px]')}>
                      {spinPick.name}
                    </div>
                    {!spinning && (
                      <div className="mt-2 space-y-1.5">
                        <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium', RELATION_LABEL[spinPick.relation].className)}>
                          {RELATION_LABEL[spinPick.relation].text}
                        </span>
                        <p className="text-[10px] text-white/30">
                          You: {spinPick.myHours}h{spinPick.myRating > 0 ? ` · ${spinPick.myRating}/10` : ''} &nbsp;·&nbsp; {friend.name}: {spinPick.theirHours}h{spinPick.theirRating > 0 ? ` · ${spinPick.theirRating}/10` : ''}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-white/20">
                    <Dices size={28} className="mx-auto mb-2" />
                    <p className="text-xs">Spin to pick tonight&apos;s co-op game</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleSpin}
                disabled={spinning || tonightPool.length === 0}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
                  spinning
                    ? 'bg-orange-500/30 text-orange-300 cursor-wait'
                    : tonightPool.length === 0
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-500 active:scale-95'
                )}
              >
                <Sparkles size={14} className={clsx(spinning && 'animate-spin')} />
                {spinning ? 'Spinning…' : spinPick ? 'Spin Again' : 'Spin!'}
              </button>
              {tonightPool.length === 0 && (
                <p className="text-[11px] text-white/30 text-center -mt-3">
                  No untouched-by-both shared games — you&apos;ve both already played or finished everything you share.
                </p>
              )}

              {/* Full match list */}
              {result && result.matches.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-white/5">
                  {result.matches.map((m, i) => (
                    <div key={m.name} className={clsx('flex items-center justify-between gap-2 px-3 py-2.5', i > 0 && 'border-t border-white/5')}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/85 truncate">{m.name}</p>
                        <p className="text-[10px] text-white/30">{m.genre ?? 'Unknown genre'}</p>
                      </div>
                      <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium', RELATION_LABEL[m.relation].className)}>
                        {RELATION_LABEL[m.relation].text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result && result.matches.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-5 text-center">
                  <Gamepad2 size={22} className="mx-auto mb-2 text-white/15" />
                  <p className="text-xs text-white/30">No overlap yet — your libraries don&apos;t share any games.</p>
                </div>
              )}

              <button
                onClick={() => { setFriend(null); setPasteValue(''); setSpinPick(null); }}
                className="w-full py-2.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Check a different friend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
