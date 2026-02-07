'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { X, Plus, Trash2, Search, Loader2, Heart, Compass, TrendingUp, Calendar, Sparkles, Star, Tag, ExternalLink } from 'lucide-react';
import { Game, PurchaseSource } from '../lib/types';
import { searchRAWGGame, searchRAWGGames, browseRAWGGames, getRAWGGenreSlugs, getRAWGPlatformIds, RAWGGameData } from '../lib/rawg-api';
import { fetchDeals, getDealLink, CheapSharkDeal } from '../lib/cheapshark-api';
import clsx from 'clsx';

interface BulkWishlistModalProps {
  onAddGames: (games: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
  existingGameNames: string[];
  existingGames: Game[];
}

interface PendingGame {
  name: string;
  thumbnail?: string | null;
  platform?: string;
  genre?: string;
  loading?: boolean;
  released?: string;
  metacritic?: number | null;
  salePrice?: number;
  normalPrice?: number;
  storeName?: string;
  dealID?: string;
}

type TabMode = 'quick-add' | 'discover' | 'search' | 'deals';
type DiscoverCategory = 'for-you' | 'upcoming' | 'top-rated' | 'new-releases' | 'hidden-gems';
type DealCategory = 'free' | 'under5' | 'under15' | 'best-deals' | 'top-rated-sale';

const PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'];

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function BulkWishlistModal({ onAddGames, onClose, existingGameNames, existingGames }: BulkWishlistModalProps) {
  const [tabMode, setTabMode] = useState<TabMode>('discover');
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [defaultPlatform, setDefaultPlatform] = useState('');

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RAWGGameData[]>([]);
  const [searching, setSearching] = useState(false);

  // Discover tab state
  const [discoverCategory, setDiscoverCategory] = useState<DiscoverCategory>('for-you');
  const [discoverResults, setDiscoverResults] = useState<RAWGGameData[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverPlatformFilter, setDiscoverPlatformFilter] = useState('');
  const [loadedCategory, setLoadedCategory] = useState<string>('');

  // Deals tab state
  const [dealCategory, setDealCategory] = useState<DealCategory>('best-deals');
  const [dealResults, setDealResults] = useState<CheapSharkDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadedDealCategory, setLoadedDealCategory] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const existingNamesSet = useMemo(() => new Set(existingGameNames.map(n => n.toLowerCase())), [existingGameNames]);
  const pendingNamesSet = useMemo(() => new Set(pendingGames.map(g => g.name.toLowerCase())), [pendingGames]);

  // Analyze user's library for recommendations
  const userPreferences = useMemo(() => {
    const owned = existingGames.filter(g => g.status !== 'Wishlist');
    const genreCounts: Record<string, { count: number; totalRating: number }> = {};
    const platformCounts: Record<string, number> = {};

    for (const game of owned) {
      if (game.genre) {
        if (!genreCounts[game.genre]) genreCounts[game.genre] = { count: 0, totalRating: 0 };
        genreCounts[game.genre].count++;
        genreCounts[game.genre].totalRating += game.rating;
      }
      if (game.platform) {
        platformCounts[game.platform] = (platformCounts[game.platform] || 0) + 1;
      }
    }

    // Sort genres by weighted score (count * avg rating)
    const topGenres = Object.entries(genreCounts)
      .map(([genre, data]) => ({
        genre,
        score: data.count * (data.totalRating / data.count),
        avgRating: data.totalRating / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const topPlatform = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    return { topGenres, topPlatform };
  }, [existingGames]);

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
      const results = await searchRAWGGames(searchQuery, 15);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleDiscover = async (category?: DiscoverCategory) => {
    const cat = category || discoverCategory;
    if (discovering) return;

    const cacheKey = `${cat}-${discoverPlatformFilter}`;
    if (loadedCategory === cacheKey && discoverResults.length > 0) return;

    setDiscovering(true);
    setDiscoverResults([]);

    try {
      const year = getCurrentYear();
      const today = new Date().toISOString().split('T')[0];
      const platformId = discoverPlatformFilter ? getRAWGPlatformIds(discoverPlatformFilter) : '';

      let results: RAWGGameData[] = [];

      switch (cat) {
        case 'for-you': {
          // Get top genres from user's library and find highly-rated games
          const genreSlugs = getRAWGGenreSlugs(userPreferences.topGenres.map(g => g.genre));
          if (genreSlugs) {
            results = await browseRAWGGames({
              genres: genreSlugs,
              ordering: '-metacritic',
              metacritic: '70,100',
              dates: `${year - 2}-01-01,${today}`,
              platforms: platformId || undefined,
              pageSize: 20,
            });
          } else {
            // No genre data - fall back to top rated recent
            results = await browseRAWGGames({
              ordering: '-metacritic',
              metacritic: '80,100',
              dates: `${year - 1}-01-01,${today}`,
              platforms: platformId || undefined,
              pageSize: 20,
            });
          }
          break;
        }
        case 'upcoming': {
          const sixMonthsOut = new Date();
          sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
          const futureDate = sixMonthsOut.toISOString().split('T')[0];
          results = await browseRAWGGames({
            dates: `${today},${futureDate}`,
            ordering: '-added',
            platforms: platformId || undefined,
            pageSize: 20,
          });
          break;
        }
        case 'top-rated': {
          results = await browseRAWGGames({
            ordering: '-metacritic',
            metacritic: '85,100',
            dates: `${year - 1}-01-01,${today}`,
            platforms: platformId || undefined,
            pageSize: 20,
          });
          break;
        }
        case 'new-releases': {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const pastDate = threeMonthsAgo.toISOString().split('T')[0];
          results = await browseRAWGGames({
            dates: `${pastDate},${today}`,
            ordering: '-released',
            platforms: platformId || undefined,
            pageSize: 20,
          });
          break;
        }
        case 'hidden-gems': {
          results = await browseRAWGGames({
            ordering: '-rating',
            metacritic: '70,85',
            dates: `${year - 2}-01-01,${today}`,
            platforms: platformId || undefined,
            pageSize: 20,
          });
          break;
        }
      }

      setDiscoverResults(results);
      setLoadedCategory(cacheKey);
    } finally {
      setDiscovering(false);
    }
  };

  const handleLoadDeals = async (category?: DealCategory) => {
    const cat = category || dealCategory;
    if (loadingDeals) return;
    if (loadedDealCategory === cat && dealResults.length > 0) return;

    setLoadingDeals(true);
    setDealResults([]);

    try {
      let deals: CheapSharkDeal[] = [];

      switch (cat) {
        case 'free':
          deals = await fetchDeals({ upperPrice: 0, sortBy: 'Metacritic', metacritic: 0, pageSize: 25 });
          break;
        case 'under5':
          deals = await fetchDeals({ upperPrice: 5, lowerPrice: 0, sortBy: 'Deal Rating', metacritic: 60, pageSize: 25 });
          break;
        case 'under15':
          deals = await fetchDeals({ upperPrice: 15, lowerPrice: 0, sortBy: 'Deal Rating', metacritic: 70, pageSize: 25 });
          break;
        case 'best-deals':
          deals = await fetchDeals({ sortBy: 'Savings', metacritic: 70, pageSize: 25 });
          break;
        case 'top-rated-sale':
          deals = await fetchDeals({ sortBy: 'Metacritic', metacritic: 80, pageSize: 25 });
          break;
      }

      setDealResults(deals);
      setLoadedDealCategory(cat);
    } finally {
      setLoadingDeals(false);
    }
  };

  const handleAddDeal = (deal: CheapSharkDeal) => {
    const salePrice = parseFloat(deal.salePrice);
    const normalPrice = parseFloat(deal.normalPrice);

    // Add to pending with price info from CheapShark
    const trimmed = deal.title.trim();
    const titleCased = toTitleCase(trimmed);
    if (isAlreadyAdded(titleCased)) return;

    const newGame: PendingGame = {
      name: titleCased,
      thumbnail: deal.thumb || undefined,
      platform: 'PC',
      loading: false,
      metacritic: deal.metacriticScore ? parseInt(deal.metacriticScore) : null,
      salePrice: salePrice,
      normalPrice: normalPrice,
      storeName: deal.storeName,
      dealID: deal.dealID,
    };

    setPendingGames(prev => [...prev, newGame]);
  };

  const handleAddFromResults = (result: RAWGGameData) => {
    addPendingGame(result.name, result.backgroundImage, result.released, result.metacritic);
  };

  const handleSaveAll = async () => {
    if (pendingGames.length === 0) return;

    setSaving(true);
    try {
      const gamesToAdd = pendingGames.map(g => ({
        name: g.name,
        price: g.salePrice ?? 0,
        hours: 0,
        rating: 8,
        status: 'Wishlist' as const,
        platform: g.platform || defaultPlatform || undefined,
        thumbnail: g.thumbnail || undefined,
        notes: g.storeName ? `Deal from ${g.storeName}` : undefined,
        review: undefined,
        genre: undefined,
        franchise: undefined,
        purchaseSource: (g.platform === 'PC' ? 'Steam' : undefined) as PurchaseSource | undefined,
        acquiredFree: g.salePrice === 0 ? true : undefined,
        originalPrice: g.normalPrice || undefined,
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

  const renderGameRow = (result: RAWGGameData) => {
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
        onClick={() => !added && handleAddFromResults(result)}
      >
        {result.backgroundImage ? (
          <img
            src={result.backgroundImage}
            alt={result.name}
            className="w-12 h-12 object-cover rounded-lg shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 bg-white/5 rounded-lg shrink-0 flex items-center justify-center">
            <Sparkles size={14} className="text-white/10" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 font-medium truncate">{result.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {result.released && (
              <span className="text-[10px] text-white/40">
                {result.released}
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
              handleAddFromResults(result);
            }}
            className="p-2 text-white/30 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all shrink-0"
            title="Add to wishlist"
          >
            <Heart size={14} />
          </button>
        )}
      </div>
    );
  };

  const DISCOVER_CATEGORIES: { id: DiscoverCategory; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'for-you', label: 'For You', icon: <Sparkles size={12} />, desc: userPreferences.topGenres.length > 0 ? `Based on your love of ${userPreferences.topGenres.map(g => g.genre).join(', ')}` : 'Top rated recent games' },
    { id: 'upcoming', label: 'Upcoming', icon: <Calendar size={12} />, desc: 'Coming in the next 6 months' },
    { id: 'top-rated', label: 'Top Rated', icon: <Star size={12} />, desc: 'Metacritic 85+ from the past year' },
    { id: 'new-releases', label: 'New Releases', icon: <TrendingUp size={12} />, desc: 'Released in the last 3 months' },
    { id: 'hidden-gems', label: 'Hidden Gems', icon: <Compass size={12} />, desc: 'High rating, moderate Metacritic' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-white/5 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Wishlist</h2>
            <p className="text-xs text-white/40 mt-0.5">Discover and add games</p>
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
          {([
            { id: 'discover' as TabMode, label: 'Discover', icon: <Compass size={14} /> },
            { id: 'deals' as TabMode, label: 'Deals', icon: <Tag size={14} /> },
            { id: 'search' as TabMode, label: 'Search', icon: <Search size={14} /> },
            { id: 'quick-add' as TabMode, label: 'Quick Add', icon: <Plus size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setTabMode(tab.id);
                if (tab.id === 'search') setTimeout(() => searchInputRef.current?.focus(), 100);
                if (tab.id === 'quick-add') setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                tabMode === tab.id
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Discover Tab */}
          {tabMode === 'discover' && (
            <>
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 shrink-0">Platform:</span>
                <select
                  value={discoverPlatformFilter}
                  onChange={e => {
                    setDiscoverPlatformFilter(e.target.value);
                    setLoadedCategory(''); // Force reload
                  }}
                  className="px-2 py-1 bg-white/[0.03] border border-white/5 text-white text-xs rounded-lg focus:outline-none"
                >
                  <option value="">All platforms</option>
                  {PLATFORMS.filter(p => p !== 'Mobile' && p !== 'Other').map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Category Chips */}
              <div className="flex flex-wrap gap-1.5">
                {DISCOVER_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setDiscoverCategory(cat.id);
                      // Auto-load when switching categories
                      setTimeout(() => {
                        const cacheKey = `${cat.id}-${discoverPlatformFilter}`;
                        if (loadedCategory !== cacheKey) {
                          handleDiscover(cat.id);
                        }
                      }, 0);
                    }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      discoverCategory === cat.id
                        ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
                    )}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Category Description + Load Button */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">
                  {DISCOVER_CATEGORIES.find(c => c.id === discoverCategory)?.desc}
                </p>
                <button
                  onClick={() => handleDiscover()}
                  disabled={discovering}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {discovering ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Compass size={12} />
                      {loadedCategory === `${discoverCategory}-${discoverPlatformFilter}` ? 'Refresh' : 'Load'}
                    </>
                  )}
                </button>
              </div>

              {/* Discovery Results */}
              {discoverResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/40">{discoverResults.length} games found</p>
                  {discoverResults.map(renderGameRow)}
                </div>
              )}

              {discoverResults.length === 0 && !discovering && loadedCategory && (
                <p className="text-xs text-white/30 text-center py-4">No games found for this filter. Try a different platform or category.</p>
              )}
            </>
          )}

          {/* Deals Tab */}
          {tabMode === 'deals' && (
            <>
              {/* Deal Category Chips */}
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'free' as DealCategory, label: 'Free Games', desc: 'Currently free on PC stores' },
                  { id: 'under5' as DealCategory, label: 'Under $5', desc: 'Metacritic 60+, under $5' },
                  { id: 'under15' as DealCategory, label: 'Under $15', desc: 'Metacritic 70+, under $15' },
                  { id: 'best-deals' as DealCategory, label: 'Best Deals', desc: 'Biggest discounts on Metacritic 70+ games' },
                  { id: 'top-rated-sale' as DealCategory, label: 'Top Rated', desc: 'Metacritic 80+ games on sale' },
                ]).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setDealCategory(cat.id);
                      setTimeout(() => {
                        if (loadedDealCategory !== cat.id) {
                          handleLoadDeals(cat.id);
                        }
                      }, 0);
                    }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      dealCategory === cat.id
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
                    )}
                  >
                    {cat.id === 'free' && <Tag size={12} />}
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">
                  Live deals from Steam, GOG, Humble, Epic & more via CheapShark
                </p>
                <button
                  onClick={() => handleLoadDeals()}
                  disabled={loadingDeals}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingDeals ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Tag size={12} />
                      {loadedDealCategory === dealCategory ? 'Refresh' : 'Load Deals'}
                    </>
                  )}
                </button>
              </div>

              {/* Deal Results */}
              {dealResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/40">{dealResults.length} deals found</p>
                  {dealResults.map(deal => {
                    const added = isAlreadyAdded(deal.title);
                    const salePrice = parseFloat(deal.salePrice);
                    const normalPrice = parseFloat(deal.normalPrice);
                    const savings = parseFloat(deal.savings);
                    const metacritic = parseInt(deal.metacriticScore);

                    return (
                      <div
                        key={deal.dealID}
                        className={clsx(
                          'flex items-center gap-3 p-2.5 rounded-lg transition-all',
                          added
                            ? 'bg-white/[0.02] opacity-50'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer'
                        )}
                        onClick={() => !added && handleAddDeal(deal)}
                      >
                        {deal.thumb ? (
                          <img
                            src={deal.thumb}
                            alt={deal.title}
                            className="w-16 h-10 object-cover rounded shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-16 h-10 bg-white/5 rounded shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 font-medium truncate">{deal.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {salePrice === 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">FREE</span>
                            ) : (
                              <>
                                <span className="text-[10px] text-emerald-400 font-bold">${salePrice.toFixed(2)}</span>
                                <span className="text-[10px] text-white/30 line-through">${normalPrice.toFixed(2)}</span>
                              </>
                            )}
                            {savings > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400">
                                -{Math.round(savings)}%
                              </span>
                            )}
                            {metacritic > 0 && (
                              <span className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                metacritic >= 75 ? 'bg-emerald-500/20 text-emerald-400' :
                                metacritic >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              )}>
                                {metacritic}
                              </span>
                            )}
                            {deal.storeName && (
                              <span className="text-[10px] text-white/25">{deal.storeName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!added && (
                            <a
                              href={getDealLink(deal.dealID)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                              title="View deal"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {added ? (
                            <span className="text-[10px] text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-lg">Added</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddDeal(deal);
                              }}
                              className="p-2 text-white/30 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                              title="Add to wishlist"
                            >
                              <Heart size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {dealResults.length === 0 && !loadingDeals && loadedDealCategory && (
                <p className="text-xs text-white/30 text-center py-4">No deals found for this category.</p>
              )}
            </>
          )}

          {/* Search Tab */}
          {tabMode === 'search' && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/5 text-white rounded-lg text-sm focus:outline-none focus:bg-white/[0.05] focus:border-purple-500/30 transition-all placeholder:text-white/30"
                  placeholder="Search for any game..."
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
                  {searchResults.map(renderGameRow)}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchQuery && (
                <p className="text-xs text-white/30 text-center py-4">No results. Try a different search term.</p>
              )}

              {!searchQuery && (
                <p className="text-[10px] text-white/30 text-center py-2">
                  Search the RAWG database for any game.
                </p>
              )}
            </>
          )}

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
                      {game.salePrice !== undefined && game.salePrice === 0 && (
                        <span className="text-[10px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">FREE</span>
                      )}
                      {game.salePrice !== undefined && game.salePrice > 0 && (
                        <span className="text-[10px] text-emerald-400">${game.salePrice.toFixed(2)}</span>
                      )}
                      {game.storeName && (
                        <span className="text-[10px] text-white/25">{game.storeName}</span>
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
