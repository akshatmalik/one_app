'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Game } from '../lib/types';
import { getTotalHours, getValueRating, calculateCostPerHour } from '../lib/calculations';

export interface GameFilters {
  searchText: string;
  statuses: string[];
  genres: string[];
  platforms: string[];
  purchaseSources: string[];
  valueRatings: string[];
  priceRange: 'all' | '0-15' | '15-30' | '30-50' | '50-70' | '70+';
  acquiredFree: boolean | null;
  hasPlayLogs: boolean | null;
  hasReview: boolean | null;
  isSpecial: boolean | null;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Partial<GameFilters>;
}

const DEFAULT_FILTERS: GameFilters = {
  searchText: '',
  statuses: [],
  genres: [],
  platforms: [],
  purchaseSources: [],
  valueRatings: [],
  priceRange: 'all',
  acquiredFree: null,
  hasPlayLogs: null,
  hasReview: null,
  isSpecial: null,
};

export const QUICK_PRESETS: FilterPreset[] = [
  {
    id: 'excellent-value',
    name: 'Best Value',
    filters: { valueRatings: ['Excellent'] },
  },
  {
    id: 'free-games',
    name: 'Free / Sub',
    filters: { acquiredFree: true },
  },
  {
    id: 'has-sessions',
    name: 'Has Sessions',
    filters: { hasPlayLogs: true },
  },
  {
    id: 'unreviewed',
    name: 'Unreviewed',
    filters: { statuses: ['Completed'], hasReview: false },
  },
  {
    id: 'money-sink',
    name: 'Poor Value',
    filters: { valueRatings: ['Poor'] },
  },
  {
    id: 'abandoned',
    name: 'Abandoned',
    filters: { statuses: ['Abandoned'] },
  },
  {
    id: 'not-started',
    name: 'Not Started',
    filters: { statuses: ['Not Started'] },
  },
  {
    id: 'specials',
    name: '★ Special',
    filters: { isSpecial: true },
  },
];

function matchesFilters(game: Game, filters: GameFilters): boolean {
  // Text search: name, notes, review, genre, platform, franchise
  if (filters.searchText) {
    const q = filters.searchText.toLowerCase().trim();
    const haystack = [
      game.name,
      game.notes ?? '',
      game.review ?? '',
      game.genre ?? '',
      game.platform ?? '',
      game.franchise ?? '',
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  // Status
  if (filters.statuses.length > 0 && !filters.statuses.includes(game.status)) return false;

  // Genre
  if (filters.genres.length > 0) {
    if (!game.genre || !filters.genres.includes(game.genre)) return false;
  }

  // Platform
  if (filters.platforms.length > 0) {
    if (!game.platform || !filters.platforms.includes(game.platform)) return false;
  }

  // Purchase source
  if (filters.purchaseSources.length > 0) {
    if (!game.purchaseSource || !filters.purchaseSources.includes(game.purchaseSource)) return false;
  }

  // Value rating
  if (filters.valueRatings.length > 0) {
    const hours = getTotalHours(game);
    const cph = calculateCostPerHour(game.price, hours);
    const vr = getValueRating(cph);
    if (!filters.valueRatings.includes(vr)) return false;
  }

  // Price range
  if (filters.priceRange !== 'all') {
    const p = game.price;
    switch (filters.priceRange) {
      case '0-15':   if (p > 15) return false; break;
      case '15-30':  if (p <= 15 || p > 30) return false; break;
      case '30-50':  if (p <= 30 || p > 50) return false; break;
      case '50-70':  if (p <= 50 || p > 70) return false; break;
      case '70+':    if (p <= 70) return false; break;
    }
  }

  // Acquired free / subscription
  if (filters.acquiredFree !== null) {
    const isFree = !!game.acquiredFree;
    if (filters.acquiredFree !== isFree) return false;
  }

  // Has play logs
  if (filters.hasPlayLogs !== null) {
    const hasLogs = (game.playLogs ?? []).length > 0;
    if (filters.hasPlayLogs !== hasLogs) return false;
  }

  // Has review
  if (filters.hasReview !== null) {
    const hasRev = !!game.review && game.review.trim().length > 0;
    if (filters.hasReview !== hasRev) return false;
  }

  // Special / beloved
  if (filters.isSpecial !== null) {
    if (filters.isSpecial !== !!game.isSpecial) return false;
  }

  return true;
}

function countActive(filters: GameFilters): number {
  let n = 0;
  if (filters.searchText) n++;
  if (filters.statuses.length > 0) n++;
  if (filters.genres.length > 0) n++;
  if (filters.platforms.length > 0) n++;
  if (filters.purchaseSources.length > 0) n++;
  if (filters.valueRatings.length > 0) n++;
  if (filters.priceRange !== 'all') n++;
  if (filters.acquiredFree !== null) n++;
  if (filters.hasPlayLogs !== null) n++;
  if (filters.hasReview !== null) n++;
  if (filters.isSpecial !== null) n++;
  return n;
}

export function useGameFilters<T extends Game>(games: T[], userId: string | null): {
  filters: GameFilters;
  setFilters: React.Dispatch<React.SetStateAction<GameFilters>>;
  filteredGames: T[];
  activeFilterCount: number;
  isFiltering: boolean;
  clearFilters: () => void;
  applyQuickPreset: (preset: FilterPreset) => void;
  savedPresets: FilterPreset[];
  savePreset: (name: string) => string;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  availableGenres: string[];
  availablePlatforms: string[];
  availablePurchaseSources: string[];
} {
  const storageKey = `game-analytics-filter-presets-${userId ?? 'local'}`;

  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistPresets = useCallback(
    (presets: FilterPreset[]) => {
      setSavedPresets(presets);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(presets));
        } catch {}
      }
    },
    [storageKey],
  );

  const filteredGames = useMemo(
    () => games.filter(g => matchesFilters(g, filters)),
    [games, filters],
  );

  const activeFilterCount = useMemo(() => countActive(filters), [filters]);
  const isFiltering = activeFilterCount > 0;

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const applyQuickPreset = useCallback((preset: FilterPreset) => {
    setFilters(prev => ({
      ...DEFAULT_FILTERS,
      ...preset.filters,
      // keep current search text when applying a preset
      searchText: prev.searchText,
    }));
  }, []);

  const savePreset = useCallback(
    (name: string) => {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}`,
        name,
        filters: { ...filters },
      };
      persistPresets([...savedPresets, newPreset]);
      return newPreset.id;
    },
    [filters, savedPresets, persistPresets],
  );

  const loadPreset = useCallback(
    (id: string) => {
      const p = savedPresets.find(x => x.id === id);
      if (p) setFilters({ ...DEFAULT_FILTERS, ...p.filters });
    },
    [savedPresets],
  );

  const deletePreset = useCallback(
    (id: string) => {
      persistPresets(savedPresets.filter(p => p.id !== id));
    },
    [savedPresets, persistPresets],
  );

  // Derived option lists from the full game library
  const availableGenres = useMemo(() => {
    const s = new Set(games.map(g => g.genre).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [games]);

  const availablePlatforms = useMemo(() => {
    const s = new Set(games.map(g => g.platform).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [games]);

  const availablePurchaseSources = useMemo(() => {
    const s = new Set(games.map(g => g.purchaseSource).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [games]);

  return {
    filters,
    setFilters,
    filteredGames,
    activeFilterCount,
    isFiltering,
    clearFilters,
    applyQuickPreset,
    savedPresets,
    savePreset,
    loadPreset,
    deletePreset,
    availableGenres,
    availablePlatforms,
    availablePurchaseSources,
  };
}
