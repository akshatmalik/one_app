'use client';

import { useMemo, useState } from 'react';
import { X, Handshake, Copy, Check, ClipboardPaste, ListPlus, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  CoopSnapshot,
  buildCoopSnapshot,
  encodeCoopCode,
  decodeCoopCode,
  compareWishlists,
} from '../lib/coop-codes';
import { formatCurrency } from '../lib/format';

interface Props {
  games: Game[];
  onAddGames: (gamesToAdd: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
}

export function CommonGroundModal({ games, onAddGames, onClose }: Props) {
  const [name, setName] = useState('Player');
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const [friend, setFriend] = useState<CoopSnapshot | null>(null);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

  const mySnapshot = useMemo(() => buildCoopSnapshot(games, name), [games, name]);
  const myCode = useMemo(() => encodeCoopCode(mySnapshot), [mySnapshot]);
  const myWishlistCount = mySnapshot.items.length;

  const comparison = useMemo(() => friend ? compareWishlists(games, friend) : null, [games, friend]);

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
    const decoded = decodeCoopCode(pasteValue);
    if (!decoded) {
      setPasteError(true);
      return;
    }
    setPasteError(false);
    setFriend(decoded);
    setAddedNames(new Set());
  }

  async function handleAddOne(name: string, price: number, genre?: string) {
    await onAddGames([{ name, price, hours: 0, rating: 0, status: 'Wishlist', genre }]);
    setAddedNames(prev => new Set(prev).add(name));
  }

  async function handleAddAll() {
    if (!comparison || comparison.theirsOnly.length === 0) return;
    setAddingAll(true);
    try {
      const toAdd = comparison.theirsOnly
        .filter(item => !addedNames.has(item.name))
        .map(item => ({ name: item.name, price: item.price, hours: 0, rating: 0, status: 'Wishlist' as const, genre: item.genre }));
      if (toAdd.length === 0) return;
      await onAddGames(toAdd);
      setAddedNames(prev => {
        const next = new Set(prev);
        toAdd.forEach(g => next.add(g.name));
        return next;
      });
    } finally {
      setAddingAll(false);
    }
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
            <Handshake size={15} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white">Common Ground</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {!friend ? (
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                See what overlaps with a friend&apos;s wishlist — no accounts, no servers. Only your
                Wishlist games are ever included in your code; nothing about what you own or play.
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
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">
                  Your code &middot; {myWishlistCount} wishlist game{myWishlistCount !== 1 ? 's' : ''}
                </p>
                {myWishlistCount === 0 ? (
                  <p className="text-[11px] text-white/30">Add games to your Wishlist first, then come back here to share.</p>
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
                        copied ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-white/70 hover:bg-white/15'
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
                  placeholder="Paste their Common Ground code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    pasteError ? 'border-red-500/50' : 'border-white/10 focus:border-amber-500/50'
                  )}
                />
                {pasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That doesn&apos;t look like a valid Common Ground code. Ask your friend to copy theirs again.
                  </p>
                )}
                <button
                  onClick={handleCompare}
                  disabled={!pasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/15 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 disabled:opacity-30 disabled:hover:bg-amber-500/15 transition-colors"
                >
                  <ClipboardPaste size={14} /> Compare
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-5 pb-8">
              <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-300">
                <Handshake size={14} />
                {comparison!.shared.length} game{comparison!.shared.length !== 1 ? 's' : ''} in common with {friend.name}
              </div>

              {comparison!.shared.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">On both your wishlists</p>
                  <div className="space-y-1.5">
                    {comparison!.shared.map(({ mine }) => (
                      <div key={mine.name} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/5">
                        <span className="text-xs text-white/80 truncate">{mine.name}</span>
                        <span className="text-[10px] text-white/30 shrink-0">{mine.genre ?? ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comparison!.theirsOnly.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider">
                      Only on {friend.name}&apos;s wishlist
                    </p>
                    <button
                      onClick={handleAddAll}
                      disabled={addingAll}
                      className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-40 transition-colors"
                    >
                      <Sparkles size={11} /> Add all to my Wishlist
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {comparison!.theirsOnly.map(item => {
                      const added = addedNames.has(item.name);
                      return (
                        <div key={item.name} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/5">
                          <div className="min-w-0">
                            <p className="text-xs text-white/80 truncate">{item.name}</p>
                            <p className="text-[10px] text-white/30">{item.price > 0 ? formatCurrency(item.price) : 'Free'}{item.genre ? ` · ${item.genre}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleAddOne(item.name, item.price, item.genre)}
                            disabled={added}
                            className={clsx(
                              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 transition-colors',
                              added ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/10 text-white/70 hover:bg-white/15'
                            )}
                          >
                            {added ? <Check size={11} /> : <ListPlus size={11} />}
                            {added ? 'Added' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {comparison!.shared.length === 0 && comparison!.theirsOnly.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-5 text-center">
                  <p className="text-xs text-white/30">{friend.name}&apos;s wishlist is empty — nothing to compare yet.</p>
                </div>
              )}

              <p className="text-[10px] text-white/20 text-center">
                You have {comparison!.mineOnlyCount} wishlist game{comparison!.mineOnlyCount !== 1 ? 's' : ''} {friend.name} doesn&apos;t.
              </p>

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
