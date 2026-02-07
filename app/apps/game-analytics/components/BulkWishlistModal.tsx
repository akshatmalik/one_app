'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Search, Loader2, Heart, Globe } from 'lucide-react';
import { Game, PurchaseSource } from '../lib/types';
import { searchRAWGGame, searchRAWGGames, RAWGGameData } from '../lib/rawg-api';
import clsx from 'clsx';

interface BulkWishlistModalProps {
  onAddGames: (games: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
  existingGameNames: string[];
}

interface PendingGame {
  name: string;
  thumbnail?: string | null;
  platform?: string;
  genre?: string;
  loading?: boolean;
  released?: string;
  metacritic?: number | null;
}

type TabMode = 'quick-add' | 'browse';

const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'];

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function BulkWishlistModal({ onAddGames, onClose, existingGameNames }: BulkWishlistModalProps) {
  const [tabMode, setTabMode] = useState<TabMode>('quick-add');
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [defaultPlatform, setDefaultPlatform] = useState('');

  // Browse tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RAWGGameData[]>([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const existingNamesSet = new Set(existingGameNames.map(n => n.toLowerCase()));
  const pendingNamesSet = new Set(pendingGames.map(g => g.name.toLowerCase()));

  const isAlreadyAdded = useCallback((name: string) => {
    const lower = name.toLowerCase();
    return existingNamesSet.has(lower) || pendingNamesSet.has(lower);
  }, [existingNamesSet, pendingNamesSet]);

  const addPendingGame = async (name: string, thumbnail?: string | null, released?: string, metacritic?: number | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const titleCased = toTitleCase(trimmed);
    if (isAlreadyAdded(titleCased)) return;

    const newGame: PendingGame = {
      name: titleCased,
      thumbnail: thumbnail || undefined,
      platform: defaultPlatform || undefined,
      loading: !thumbnail,
      released,
      metacritic,
    };

    setPendingGames(prev => [...prev, newGame]);

    // Fetch thumbnail from RAWG if not provided
    if (!thumbnail) {
      try {
        const rawgData = await searchRAWGGame(trimmed);
        setPendingGames(prev =>
          prev.map(g =>
            g.name === titleCased
              ? { ...g, thumbnail: rawgData?.backgroundImage, loading: false }
              : g
          )
        );
      } catch {
        setPendingGames(prev =>
          prev.map(g => (g.name === titleCased ? { ...g, loading: false } : g))
        );
      }
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    addPendingGame(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (name: string) => {
    setPendingGames(prev => prev.filter(g => g.name !== name));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;

    setSearching(true);
    try {
      const results = await searchRAWGGames(searchQuery, 12);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFromSearch = (result: RAWGGameData) => {
    addPendingGame(result.name, result.backgroundImage, result.released, result.metacritic);
  };

  const handleSaveAll = async () => {
    if (pendingGames.length === 0) return;

    setSaving(true);
    try {
      const gamesToAdd = pendingGames.map(g => ({
        name: g.name,
        price: 0,
        hours: 0,
        rating: 8,
        status: 'Wishlist' as const,
        platform: g.platform || defaultPlatform || undefined,
        thumbnail: g.thumbnail || undefined,
        notes: undefined,
        review: undefined,
        genre: undefined,
        franchise: undefined,
        purchaseSource: undefined as PurchaseSource | undefined,
        acquiredFree: undefined,
        originalPrice: undefined,
        subscriptionSource: undefined,
        datePurchased: undefined,
        startDate: undefined,
        endDate: undefined,
        playLogs: [],
      }));

      await onAddGames(gamesToAdd);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Wishlist</h2>
            <p className="text-xs text-white/40 mt-0.5">Add multiple games at once</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-3 border-b border-white/5 shrink-0">
          <button
            onClick={() => setTabMode('quick-add')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              tabMode === 'quick-add'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            )}
          >
            <Plus size={14} />
            Quick Add
          </button>
          <button
            onClick={() => {
              setTabMode('browse');
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              tabMode === 'browse'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            )}
          >
            <Globe size={14} />
            Browse RAWG
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Add Tab */}
          {tabMode === 'quick-add' && (
            <>
              {/* Default Platform */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 shrink-0">Default platform:</span>
                <select
                  value={defaultPlatform}
                  onChange={e => setDefaultPlatform(e.target.value)}
                  className="px-2 py-1 bg-white/[0.03] border border-white/5 text-white text-xs rounded-lg focus:outline-none"
                >
                  <option value="">None</option>
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Input */}
              <form onSubmit={handleQuickAdd} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all placeholder:text-white/30"
                  placeholder="Type game name and press Enter..."
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-30 disabled:hover:bg-purple-600"
                >
                  <Plus size={16} />
                </button>
              </form>

              <p className="text-[10px] text-white/30">
                Tip: Type a name and press Enter. Thumbnails auto-fetch from RAWG.
              </p>
            </>
          )}

          {/* Browse Tab */}
          {tabMode === 'browse' && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all placeholder:text-white/30"
                  placeholder="Search for games..."
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || searching}
                  className="px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-30"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/40">{searchResults.length} results</p>
                  {searchResults.map(result => {
                    const added = isAlreadyAdded(result.name);
                    return (
                      <div
                        key={result.id}
                        className={clsx(
                          'flex items-center gap-3 p-2.5 rounded-lg transition-all',
                          added
                            ? 'bg-white/[0.02] opacity-50'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer'
                        )}
                        onClick={() => !added && handleAddFromSearch(result)}
                      >
                        {result.backgroundImage ? (
                          <img
                            src={result.backgroundImage}
                            alt={result.name}
                            className="w-12 h-12 object-cover rounded-lg shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-white/5 rounded-lg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 font-medium truncate">{result.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {result.released && (
                              <span className="text-[10px] text-white/40">
                                {new Date(result.released).getFullYear()}
                              </span>
                            )}
                            {result.metacritic && (
                              <span className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                result.metacritic >= 75 ? 'bg-emerald-500/20 text-emerald-400' :
                                result.metacritic >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              )}>
                                {result.metacritic}
                              </span>
                            )}
                            {result.rating > 0 && (
                              <span className="text-[10px] text-white/30">{result.rating.toFixed(1)}/5</span>
                            )}
                          </div>
                        </div>
                        {added ? (
                          <span className="text-[10px] text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-lg shrink-0">Added</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFromSearch(result);
                            }}
                            className="p-2 text-white/30 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all shrink-0"
                            title="Add to wishlist"
                          >
                            <Heart size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchQuery && (
                <p className="text-xs text-white/30 text-center py-4">No results. Try a different search term.</p>
              )}

              {!searchQuery && (
                <p className="text-[10px] text-white/30 text-center py-2">
                  Search RAWG database for games to add to your wishlist.
                </p>
              )}
            </>
          )}

          {/* Pending Games List */}
          {pendingGames.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  {pendingGames.length} game{pendingGames.length !== 1 ? 's' : ''} to add
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {pendingGames.map(game => (
                <div
                  key={game.name}
                  className="flex items-center gap-3 p-2.5 bg-purple-500/5 border border-purple-500/10 rounded-lg"
                >
                  {game.loading ? (
                    <div className="w-10 h-10 bg-white/5 rounded-lg shrink-0 flex items-center justify-center">
                      <Loader2 size={12} className="text-white/20 animate-spin" />
                    </div>
                  ) : game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-10 h-10 object-cover rounded-lg shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white/5 rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{game.name}</p>
                    <div className="flex items-center gap-1.5">
                      {game.platform && (
                        <span className="text-[10px] text-white/30">{game.platform}</span>
                      )}
                      {game.released && (
                        <span className="text-[10px] text-white/30">{game.released}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(game.name)}
                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={pendingGames.length === 0 || saving}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-sm font-medium disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Heart size={14} />
                  Add {pendingGames.length} to Wishlist
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
