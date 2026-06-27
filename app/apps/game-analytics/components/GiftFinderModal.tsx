'use client';

import { useMemo, useState } from 'react';
import { X, Copy, Check, ClipboardPaste, Gift, PackageCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  GiftSnapshot,
  buildGiftSnapshot,
  encodeGiftCode,
  decodeGiftCode,
  findBestGiftBundle,
} from '../lib/gift-codes';
import { getGiftedNames, markAsGifted, unmarkAsGifted } from '../lib/gift-tracker-storage';
import { formatCurrency } from '../lib/format';

interface Props {
  wishlistGames: Game[];
  userId: string | null;
  onClose: () => void;
}

export function GiftFinderModal({ wishlistGames, userId, onClose }: Props) {
  const [name, setName] = useState('Player');
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const [friend, setFriend] = useState<GiftSnapshot | null>(null);
  const [budget, setBudget] = useState(60);
  const [gifted, setGifted] = useState<string[]>([]);

  const mySnapshot = useMemo(() => buildGiftSnapshot(wishlistGames, name), [wishlistGames, name]);
  const myCode = useMemo(() => encodeGiftCode(mySnapshot), [mySnapshot]);

  const result = useMemo(() => {
    if (!friend) return null;
    return findBestGiftBundle(friend, budget, new Set(gifted));
  }, [friend, budget, gifted]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleFindGifts() {
    const decoded = decodeGiftCode(pasteValue);
    if (!decoded || decoded.items.length === 0) {
      setPasteError(true);
      return;
    }
    setPasteError(false);
    setFriend(decoded);
    setGifted(getGiftedNames(userId ?? '', decoded.name));
  }

  function toggleGifted(itemName: string) {
    if (!friend) return;
    const key = userId ?? '';
    const isGifted = gifted.includes(itemName);
    const updated = isGifted ? unmarkAsGifted(key, friend.name, itemName) : markAsGifted(key, friend.name, itemName);
    setGifted(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Gift size={15} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white">Gift Finder</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {!friend ? (
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                Share your Wishlist code so a friend knows exactly what to get you — or paste theirs and
                tell us your budget for an optimal pick. Only names, genres, platforms and expected prices
                are shared, ordered by how much you actually want each one (your saved Wishlist Planner order).
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
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">
                  Your Gift Finder code ({mySnapshot.items.length} wishlist game{mySnapshot.items.length === 1 ? '' : 's'})
                </p>
                {mySnapshot.items.length === 0 ? (
                  <p className="text-xs text-white/30">Add games to your Wishlist first, then come back to share a code.</p>
                ) : (
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
                )}
              </div>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Paste a friend&apos;s code
                </label>
                <textarea
                  value={pasteValue}
                  onChange={e => { setPasteValue(e.target.value); setPasteError(false); }}
                  placeholder="Paste their Gift Finder code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    pasteError ? 'border-red-500/50' : 'border-white/10 focus:border-purple-500/50'
                  )}
                />
                {pasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That doesn&apos;t look like a valid Gift Finder code (or their wishlist was empty). Ask them to copy theirs again.
                  </p>
                )}

                <div className="mt-3">
                  <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                    Your budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      value={budget}
                      onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-7 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleFindGifts}
                  disabled={!pasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-500/15 text-purple-300 text-sm font-semibold hover:bg-purple-500/20 disabled:opacity-30 disabled:hover:bg-purple-500/15 transition-colors"
                >
                  <ClipboardPaste size={14} /> Find the Best Gift
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-5 pb-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white/90">Gifts for {friend.name}</p>
                  <p className="text-[10px] text-white/30">{friend.items.length} item{friend.items.length === 1 ? '' : 's'} on their wishlist</p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-xl font-bold text-purple-300 tabular-nums">{formatCurrency(budget)}</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider">Budget</p>
                </div>
              </div>

              {result && result.bundle.length > 0 ? (
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-pink-500/10 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={13} className="text-purple-300" />
                    <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                      {result.bundle.length > 1 ? 'Best gift bundle' : 'Best gift pick'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {result.bundle.map(pick => (
                      <div key={pick.item.name} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white/90 truncate">{pick.item.name}</span>
                        <span className="text-xs text-white/40 shrink-0">{formatCurrency(pick.item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Total</span>
                    <span className="text-xs font-bold text-white/70">{formatCurrency(result.totalCost)} of {formatCurrency(budget)}</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1.5">
                    Picked to maximize how much they want it within your budget — not just the cheapest fit.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-5 text-center">
                  <Gift size={22} className="mx-auto mb-2 text-white/15" />
                  <p className="text-xs text-white/30">
                    Nothing on their wishlist fits {formatCurrency(budget)} — try raising your budget.
                  </p>
                </div>
              )}

              {/* Full ranked list with gifted tracker */}
              <div>
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">
                  Full wishlist, most wanted first
                </p>
                <div className="rounded-xl overflow-hidden border border-white/5">
                  {friend.items.map((item, i) => {
                    const isGifted = gifted.includes(item.name);
                    const inBundle = result?.bundle.some(p => p.item.name === item.name);
                    return (
                      <div key={item.name} className={clsx('flex items-center justify-between gap-2 px-3 py-2.5', i > 0 && 'border-t border-white/5', isGifted && 'opacity-40')}>
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-[10px] text-white/20 font-mono w-4 shrink-0">#{item.priority}</span>
                          <div className="min-w-0">
                            <p className={clsx('text-xs font-medium truncate', isGifted ? 'text-white/40 line-through' : 'text-white/85')}>{item.name}</p>
                            <p className="text-[10px] text-white/30">
                              {item.genre ?? 'Unknown genre'}{item.price > 0 ? ` · ${formatCurrency(item.price)}` : ' · price unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {inBundle && !isGifted && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/15 text-purple-300">Pick</span>
                          )}
                          <button
                            onClick={() => toggleGifted(item.name)}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              isGifted ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                            )}
                            title={isGifted ? 'Mark as not gifted' : 'Mark as already gifted'}
                          >
                            <PackageCheck size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => { setFriend(null); setPasteValue(''); }}
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
