'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PurchaseQueueEntry } from '../lib/types';
import { fetchCheapestPrice } from '../lib/price-fetch';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const RATE_LIMIT_MS = 320; // ms between CheapShark requests

interface CachedDealPrice {
  price: number;
  source: string;
}

interface DealCache {
  ts: number;
  deals: Record<string, CachedDealPrice>; // gameName → price
}

function cacheKey(userId: string | null): string {
  return `deal-watch-v1-${userId ?? 'local'}`;
}

function loadCache(userId: string | null): DealCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as DealCache) : null;
  } catch {
    return null;
  }
}

function saveCache(userId: string | null, cache: DealCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(cache));
  } catch {}
}

export interface LiveDealInfo {
  /** Cheapest current PC price from CheapShark */
  price: number;
  source: string;
  /** True when current price is at or below the entry's targetPrice */
  isAtTarget: boolean;
  /** Savings vs MSRP estimate, if available */
  savingsVsMsrp: number | null;
  savingsPercent: number | null;
}

export interface UseDealWatchResult {
  /** Live price data keyed by gameName */
  deals: Record<string, LiveDealInfo>;
  loading: boolean;
  /** When the last batch fetch completed */
  lastChecked: Date | null;
  /** True when ≥1 tracked game is at or below its target price */
  hasActiveDeals: boolean;
  activeDealsCount: number;
  /** Force a fresh fetch, bypassing cache */
  refresh: () => void;
}

export function useDealWatch(
  entries: PurchaseQueueEntry[],
  userId: string | null,
): UseDealWatchResult {
  const [deals, setDeals] = useState<Record<string, LiveDealInfo>>({});
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const isFetching = useRef(false);
  const mountedRef = useRef(true);

  // Only track committed + maybe entries that haven't been purchased
  const trackable = entries.filter(
    e =>
      !e.purchased &&
      (e.intent ?? (e.isMaybe ? 'maybe' : 'committed')) !== 'deferred',
  );

  // Build enriched deal map from raw cache data
  const enrichDeals = useCallback(
    (raw: Record<string, CachedDealPrice>, ts: number) => {
      const map: Record<string, LiveDealInfo> = {};
      for (const [name, dp] of Object.entries(raw)) {
        const entry = trackable.find(e => e.gameName === name);
        if (!entry) continue;
        const isAtTarget = entry.targetPrice != null && dp.price <= entry.targetPrice;
        const msrp = entry.msrpEstimate ?? null;
        const savingsVsMsrp = msrp != null ? msrp - dp.price : null;
        const savingsPercent =
          msrp != null && msrp > 0
            ? Math.round(((msrp - dp.price) / msrp) * 100)
            : null;
        map[name] = {
          price: dp.price,
          source: dp.source,
          isAtTarget,
          savingsVsMsrp,
          savingsPercent,
        };
      }
      setDeals(map);
      setLastChecked(new Date(ts));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fetchAll = useCallback(async () => {
    if (isFetching.current || trackable.length === 0) return;
    isFetching.current = true;
    if (mountedRef.current) setLoading(true);

    const freshDeals: Record<string, CachedDealPrice> = {};

    for (const entry of trackable) {
      if (!mountedRef.current) break;
      try {
        const result = await fetchCheapestPrice(entry.gameName);
        if (result) {
          freshDeals[entry.gameName] = { price: result.price, source: result.source };
        }
      } catch {
        // silent — network or CORS
      }
      // polite rate limit
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    if (!mountedRef.current) {
      isFetching.current = false;
      return;
    }

    const cache: DealCache = { ts: Date.now(), deals: freshDeals };
    saveCache(userId, cache);
    enrichDeals(freshDeals, cache.ts);
    setLoading(false);
    isFetching.current = false;
  }, [trackable, userId, enrichDeals]);

  // On mount: load cache if fresh, else fetch in background
  useEffect(() => {
    mountedRef.current = true;
    if (trackable.length === 0) return;

    const cached = loadCache(userId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      enrichDeals(cached.deals, cached.ts);
      return;
    }

    fetchAll();
    return () => {
      mountedRef.current = false;
    };
    // Only run when userId or entry count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trackable.length]);

  const hasActiveDeals = Object.values(deals).some(d => d.isAtTarget);
  const activeDealsCount = Object.values(deals).filter(d => d.isAtTarget).length;

  return { deals, loading, lastChecked, hasActiveDeals, activeDealsCount, refresh: fetchAll };
}
