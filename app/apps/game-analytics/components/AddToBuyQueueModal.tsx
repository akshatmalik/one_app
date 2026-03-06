'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Star, Calendar, Check, ShoppingCart } from 'lucide-react';
import { searchRAWGGames, RAWGGameData } from '../lib/rawg-api';
import { PurchaseQueueEntry } from '../lib/types';

const PLATFORMS = ['PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'PC', 'Other'];

interface Props {
  onAdd: (data: Omit<PurchaseQueueEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<unknown>;
  onClose: () => void;
  nextPriority: number;
  wishlistGames?: { name: string; platform?: string; genre?: string; thumbnail?: string }[];
}

function formatRelease(date: string | undefined): string {
  if (!date) return 'TBA';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return date;
  }
}

function isUpcoming(date: string | undefined): boolean {
  if (!date) return false;
  return new Date(date) > new Date();
}

export function AddToBuyQueueModal({ onAdd, onClose, nextPriority, wishlistGames = [] }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAWGGameData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RAWGGameData | null>(null);
  const [customName, setCustomName] = useState('');

  // Form fields
  const [platform, setPlatform] = useState('PS5');
  const [isDayOneBuy, setIsDayOneBuy] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [msrpEstimate, setMsrpEstimate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWishlistImport, setShowWishlistImport] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchRAWGGames(query, 8);
        setResults(res);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const handleSelect = (game: RAWGGameData) => {
    setSelected(game);
    setQuery(game.name);
    setResults([]);
    if (game.metacritic && game.metacritic >= 60) {
      // Guess MSRP from metacritic tier as a hint (user can override)
      setMsrpEstimate(game.metacritic >= 85 ? '70' : game.metacritic >= 70 ? '50' : '30');
    }
    if (isUpcoming(game.released)) {
      setIsDayOneBuy(false);
    }
  };

  const handleWishlistImport = (wg: { name: string; platform?: string; genre?: string; thumbnail?: string }) => {
    setSelected({
      id: 0,
      name: wg.name,
      backgroundImage: wg.thumbnail || null,
      rating: 0,
      released: '',
      metacritic: null,
    });
    setQuery(wg.name);
    if (wg.platform) setPlatform(wg.platform);
    setShowWishlistImport(false);
  };

  const handleSubmit = async () => {
    const name = selected?.name || customName.trim() || query.trim();
    if (!name) return;

    setSaving(true);
    try {
      await onAdd({
        gameName: name,
        thumbnail: selected?.backgroundImage || undefined,
        platform,
        releaseDate: selected?.released || undefined,
        metacriticScore: selected?.metacritic || undefined,
        rawgRating: selected?.rating || undefined,
        isDayOneBuy,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
        msrpEstimate: msrpEstimate ? parseFloat(msrpEstimate) : undefined,
        notes: notes.trim() || undefined,
        priority: nextPriority,
        purchased: false,
        addedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const displayName = selected?.name || query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-400" />
            <h2 className="text-white font-semibold">Add to Buy Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            {wishlistGames.length > 0 && (
              <button
                onClick={() => setShowWishlistImport(!showWishlistImport)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded bg-purple-500/10"
              >
                From Wishlist
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Wishlist import dropdown */}
          {showWishlistImport && wishlistGames.length > 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs text-white/40">Select from wishlist</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {wishlistGames.map((wg, i) => (
                  <button
                    key={i}
                    onClick={() => handleWishlistImport(wg)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    {wg.thumbnail ? (
                      <img src={wg.thumbnail} alt="" className="w-8 h-6 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-6 rounded bg-white/5 flex-shrink-0" />
                    )}
                    <span className="text-sm text-white/80 truncate">{wg.name}</span>
                    {wg.platform && <span className="text-xs text-white/30 ml-auto">{wg.platform}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Search game</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                placeholder="Type a game name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              {searching && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />
              )}
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <div className="mt-1.5 bg-[#0f0f1e] border border-white/10 rounded-xl overflow-hidden">
                {results.map(game => (
                  <button
                    key={game.id}
                    onClick={() => handleSelect(game)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    {game.backgroundImage ? (
                      <img src={game.backgroundImage} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-7 rounded bg-white/5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/90 truncate">{game.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {game.released && (
                          <span className="text-[11px] text-white/30 flex items-center gap-1">
                            <Calendar size={9} />
                            {isUpcoming(game.released) ? `Coming ${formatRelease(game.released)}` : formatRelease(game.released)}
                          </span>
                        )}
                        {game.metacritic && (
                          <span className="text-[11px] text-white/30 flex items-center gap-1">
                            <Star size={9} />
                            {game.metacritic}
                          </span>
                        )}
                      </div>
                    </div>
                    {isUpcoming(game.released) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">
                        Upcoming
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected game preview */}
            {selected && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                {selected.backgroundImage && (
                  <img src={selected.backgroundImage} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white/90 truncate">{selected.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selected.released && (
                      <span className="text-[11px] text-white/40">
                        {isUpcoming(selected.released) ? `Releases ${formatRelease(selected.released)}` : `Released ${formatRelease(selected.released)}`}
                      </span>
                    )}
                    {selected.metacritic && (
                      <span className="text-[11px] text-white/40">MC: {selected.metacritic}</span>
                    )}
                  </div>
                </div>
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    platform === p
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border border-transparent hover:text-white/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Day One toggle */}
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
            <div>
              <div className="text-sm text-white/80">Day One Buy</div>
              <div className="text-xs text-white/30 mt-0.5">Buy immediately on release / right now</div>
            </div>
            <button
              onClick={() => setIsDayOneBuy(!isDayOneBuy)}
              className={`w-10 h-5 rounded-full transition-all relative ${isDayOneBuy ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isDayOneBuy ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">MSRP / Full price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={msrpEstimate}
                  onChange={e => setMsrpEstimate(e.target.value)}
                  placeholder="70"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Seen at (now)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={currentPrice}
                  onChange={e => setCurrentPrice(e.target.value)}
                  placeholder="—"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Buy at</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  placeholder="—"
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/20 -mt-2">Prices are manual — check PS Store for current deals</p>

          {/* Notes */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Wait for Black Friday, get physical edition..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || (!displayName)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all"
          >
            {saving ? 'Adding...' : `Add "${displayName || '...'}" to Buy Queue`}
          </button>
        </div>
      </div>
    </div>
  );
}
