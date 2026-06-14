'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Game, GameRecommendation, RecommendationStatus, SubscriptionTier } from '../lib/types';
import { recommendationRepository } from '../lib/recommendation-storage';
import { searchRAWGGame } from '../lib/rawg-api';
import { buildTasteProfile } from '../lib/calculations';
import { scoreUpcomingGames } from '../lib/ai-recommendation-service';
import { fetchMonthlyDrops, getCachedDrops, MonthlyDropResult, SubscriptionGameItem } from '../lib/subscription-games-service';
import {
  SubscriptionSettings,
  loadSubscriptionSettings,
  saveSubscriptionSettings,
  monthKey,
  latestAvailableMonth,
  recentMonths,
  hasNewDrop as computeHasNewDrop,
  SUBSCRIPTION_ANNUAL_COST,
} from '../lib/subscription-settings';

const SERVICE = 'PS Plus' as const;
const TOP_PICK_THRESHOLD = 8; // hypeScore >= this => flagged as a strong personal match

export interface SyncProgress {
  active: boolean;
  current: string;        // month being synced
  done: number;
  total: number;
}

interface AddGameData {
  name: string; rating: number; hours?: number; price?: number; datePurchased?: string;
}

interface UseSubscriptionGamesArgs {
  userId: string | null;
  games: Game[];
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  onAddToQueue: (gameId: string) => Promise<void>;
  onUpdateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
}

export function useSubscriptionGames({ userId, games, onAddGame, onAddToQueue, onUpdateGame }: UseSubscriptionGamesArgs) {
  const [settings, setSettings] = useState<SubscriptionSettings>(() => loadSubscriptionSettings(userId || ''));
  const [recs, setRecs] = useState<GameRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<SyncProgress>({ active: false, current: '', done: 0, total: 0 });
  const [lastResult, setLastResult] = useState<MonthlyDropResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const uid = userId || '';
  const tasteProfile = useMemo(() => buildTasteProfile(games), [games]);

  // Keep a live ref to games so async sync loops dedupe against the latest library.
  const gamesRef = useRef(games);
  gamesRef.current = games;

  useEffect(() => {
    recommendationRepository.setUserId(userId || '');
    setSettings(loadSubscriptionSettings(userId || ''));
  }, [userId]);

  // Restore the latest cached lineup (citation, sources, leaving-soon) on mount
  // so that info survives reloads without re-running the search.
  useEffect(() => {
    const cached = getCachedDrops(settings.psPlusTier, latestAvailableMonth());
    if (cached) setLastResult(cached);
  }, [settings.psPlusTier]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const all = await recommendationRepository.getAll();
      setRecs(all.filter(r => r.subscriptionService === SERVICE));
    } catch (e) {
      // Don't let a load failure masquerade as "no data" — that's exactly what
      // made backfilled drops look lost and forced a re-sync every visit.
      console.error('[PS Plus] Failed to load saved recommendations:', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, userId]);

  const persistSettings = useCallback((next: SubscriptionSettings) => {
    setSettings(next);
    saveSubscriptionSettings(uid, next);
  }, [uid]);

  const setEnabled = useCallback((enabled: boolean) => {
    persistSettings({ ...settings, psPlusEnabled: enabled });
  }, [settings, persistSettings]);

  const setTier = useCallback((tier: SubscriptionTier) => {
    persistSettings({ ...settings, psPlusTier: tier });
  }, [settings, persistSettings]);

  // ── Core sync for a single month ───────────────────────────────────────────
  // `known` lets a backfill loop share one dedupe set across months without
  // waiting on async state updates.
  const syncMonth = useCallback(async (month: string, tier: SubscriptionTier, known?: Set<string>): Promise<number> => {
    const result = await fetchMonthlyDrops(tier, month);
    setLastResult(result);

    const ownedNames = new Set(gamesRef.current.map(g => g.name.toLowerCase()));
    const knownNames = known || new Set(recs.map(r => r.gameName.toLowerCase()));

    // Candidates we don't already own and haven't already recommended this run.
    const candidates = result.games.filter(g => {
      const n = g.name.toLowerCase();
      if (ownedNames.has(n) || knownNames.has(n)) return false;
      knownNames.add(n);
      return true;
    });

    if (candidates.length === 0) return 0;

    // Personalize — best-effort; fall back to a neutral score on failure.
    let scores: Array<{ gameName: string; hypeScore: number; reason: string }> = [];
    try {
      scores = await scoreUpcomingGames(
        candidates.map(c => ({ name: c.name, genre: c.genre })),
        tasteProfile,
        gamesRef.current,
      );
    } catch {
      scores = [];
    }

    const saved: GameRecommendation[] = [];
    for (const c of candidates) {
      const score = scores.find(s => s.gameName.toLowerCase() === c.name.toLowerCase());
      const hypeScore = score?.hypeScore ?? 5;
      const reason = score?.reason || `Free on PS Plus${c.genre ? ` — a ${c.genre} pick` : ''}.`;

      // Best-effort thumbnail/metadata enrichment.
      let thumbnail: string | undefined;
      let metacritic: number | undefined;
      let rawgRating: number | undefined;
      let releaseDate: string | undefined;
      try {
        const rawg = await searchRAWGGame(c.name);
        thumbnail = rawg?.backgroundImage || undefined;
        metacritic = rawg?.metacritic || undefined;
        rawgRating = rawg?.rating || undefined;
        releaseDate = rawg?.released || undefined;
      } catch { /* enrichment is optional */ }

      const rec = await recommendationRepository.create({
        gameName: c.name,
        genre: c.genre,
        platform: c.platform,
        thumbnail,
        metacritic,
        rawgRating,
        releaseDate,
        aiReason: reason,
        status: 'suggested',
        hypeScore,
        isTopPick: hypeScore >= TOP_PICK_THRESHOLD,
        subscriptionService: SERVICE,
        subscriptionTier: tier,
        subscriptionBucket: c.bucket,
        catalogMonth: month,
        estimatedPrice: c.estimatedPrice,
        sourceUrl: result.primarySource?.uri,
        sourceTitle: result.primarySource?.title,
        suggestedAt: new Date().toISOString(),
      });
      saved.push(rec);
    }

    setRecs(prev => [...saved, ...prev]);
    return saved.length;
  }, [recs, tasteProfile]);

  // ── Sync the current/latest available month ────────────────────────────────
  const syncLatest = useCallback(async () => {
    setError(null);
    const month = latestAvailableMonth();
    setProgress({ active: true, current: month, done: 0, total: 1 });
    try {
      await syncMonth(month, settings.psPlusTier);
      const next: SubscriptionSettings = {
        ...settings,
        lastSyncedMonth: settings.lastSyncedMonth && settings.lastSyncedMonth > month ? settings.lastSyncedMonth : month,
        backfillStartMonth: settings.backfillStartMonth && settings.backfillStartMonth < month ? settings.backfillStartMonth : month,
        dismissedMonths: settings.dismissedMonths.filter(m => m !== month),
      };
      persistSettings(next);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setProgress({ active: false, current: '', done: 0, total: 0 });
    }
  }, [settings, syncMonth, persistSettings]);

  // ── Backfill the last N months in one pass (bootstrap) ──────────────────────
  const backfill = useCallback(async (monthsBack: number) => {
    setError(null);
    const months = recentMonths(monthsBack, latestAvailableMonth()); // newest → oldest
    const known = new Set([
      ...recs.map(r => r.gameName.toLowerCase()),
      ...gamesRef.current.map(g => g.name.toLowerCase()),
    ]);
    setProgress({ active: true, current: months[0], done: 0, total: months.length });
    try {
      for (let i = 0; i < months.length; i++) {
        setProgress({ active: true, current: months[i], done: i, total: months.length });
        await syncMonth(months[i], settings.psPlusTier, known);
      }
      const oldest = months[months.length - 1];
      const newest = months[0];
      persistSettings({
        ...settings,
        lastSyncedMonth: newest,
        backfillStartMonth: oldest,
        dismissedMonths: [],
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setProgress({ active: false, current: '', done: 0, total: 0 });
    }
  }, [recs, settings, syncMonth, persistSettings]);

  const dismissNudge = useCallback(() => {
    const month = latestAvailableMonth();
    if (settings.dismissedMonths.includes(month)) return;
    persistSettings({ ...settings, dismissedMonths: [...settings.dismissedMonths, month] });
  }, [settings, persistSettings]);

  // ── Triage / status ─────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (id: string, status: RecommendationStatus) => {
    try {
      await recommendationRepository.update(id, { status, respondedAt: new Date().toISOString() });
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  const markDismissed = useCallback((id: string) => updateStatus(id, 'dismissed'), [updateStatus]);
  const undoDismiss = useCallback((id: string) => updateStatus(id, 'suggested'), [updateStatus]);
  // "Save for later" — a no-commitment maybe. Stays in the panel's Saved list
  // only; nothing is added to the library.
  const saveForLater = useCallback((id: string) => updateStatus(id, 'watching'), [updateStatus]);

  // ── Add to library (tagged as a free PS Plus game) ──────────────────────────
  const buildFreeGame = useCallback((
    rec: GameRecommendation,
    status: Game['status'],
    extra?: Partial<Game>,
  ): Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'> => ({
    name: rec.gameName,
    price: 0,
    hours: 0,
    rating: 0,
    status,
    genre: rec.genre || undefined,
    platform: rec.platform || 'PS5',
    acquiredFree: true,
    originalPrice: rec.estimatedPrice,
    subscriptionSource: SERVICE,
    purchaseSource: 'PlayStation',
    datePurchased: rec.catalogMonth ? `${rec.catalogMonth}-01` : undefined,
    thumbnail: rec.thumbnail,
    ...extra,
  }),  []);

  const addToUpNext = useCallback(async (rec: GameRecommendation) => {
    try {
      const game = await onAddGame(buildFreeGame(rec, 'Not Started'));
      await onAddToQueue(game.id);
      await updateStatus(rec.id, 'interested');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [onAddGame, onAddToQueue, buildFreeGame, updateStatus]);

  const addToWishlist = useCallback(async (rec: GameRecommendation) => {
    try {
      await onAddGame(buildFreeGame(rec, 'Wishlist'));
      await updateStatus(rec.id, 'wishlisted');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [onAddGame, buildFreeGame, updateStatus]);

  const addAsPlayed = useCallback(async (rec: GameRecommendation, data: AddGameData) => {
    try {
      await onAddGame(buildFreeGame(rec, 'Completed', {
        rating: data.rating,
        hours: data.hours || 0,
        datePurchased: data.datePurchased || (rec.catalogMonth ? `${rec.catalogMonth}-01` : undefined),
      }));
      await updateStatus(rec.id, 'played');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [onAddGame, buildFreeGame, updateStatus]);

  // Bulk: add every top pick still awaiting a decision to Up Next.
  const addAllTopPicksToUpNext = useCallback(async () => {
    const picks = recs.filter(r => r.status === 'suggested' && r.isTopPick);
    for (const rec of picks) {
      // eslint-disable-next-line no-await-in-loop
      await addToUpNext(rec);
    }
  }, [recs, addToUpNext]);

  // Bulk: claim every still-available Monthly (Essential) game into Up Next.
  const claimAllMonthly = useCallback(async () => {
    const monthly = recs.filter(r => r.status === 'suggested' && r.subscriptionBucket === 'monthly');
    for (const rec of monthly) {
      // eslint-disable-next-line no-await-in-loop
      await addToUpNext(rec);
    }
  }, [recs, addToUpNext]);

  // Retroactively tag a game you already own as a free PS Plus claim, crediting
  // the savings. `rec` is the matching drop we found for it.
  const reclaim = useCallback(async (gameId: string, rec: GameRecommendation) => {
    const game = gamesRef.current.find(g => g.id === gameId);
    try {
      await onUpdateGame(gameId, {
        acquiredFree: true,
        subscriptionSource: SERVICE,
        originalPrice: game?.originalPrice || rec.estimatedPrice,
      });
      await updateStatus(rec.id, 'played');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [onUpdateGame, updateStatus]);

  // ── Derived views ────────────────────────────────────────────────────────────
  const available = useMemo(() => recs.filter(r => r.status === 'suggested'), [recs]);
  const monthlyAvailable = useMemo(() => available.filter(r => r.subscriptionBucket === 'monthly'), [available]);
  const catalogAvailable = useMemo(() => available.filter(r => r.subscriptionBucket !== 'monthly'), [available]);
  const topPicks = useMemo(
    () => available.filter(r => r.isTopPick).sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0)),
    [available],
  );
  const saved = useMemo(() => recs.filter(r => r.status === 'interested' || r.status === 'watching' || r.status === 'wishlisted'), [recs]);
  const dismissed = useMemo(() => recs.filter(r => r.status === 'dismissed'), [recs]);

  // Months we have drops for, newest first.
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const r of recs) if (r.catalogMonth) set.add(r.catalogMonth);
    return [...set].sort().reverse();
  }, [recs]);

  // Value of games actually claimed via PS Plus (from the real library).
  const claimedValue = useMemo(() => {
    const claimed = games.filter(g => g.acquiredFree && g.subscriptionSource === SERVICE);
    const yr = String(new Date().getFullYear());
    const thisYear = claimed.filter(g => (g.datePurchased || '').slice(0, 4) === yr);
    return {
      count: claimed.length,
      value: claimed.reduce((s, g) => s + (g.originalPrice || 0), 0),
      thisYearCount: thisYear.length,
      thisYearValue: thisYear.reduce((s, g) => s + (g.originalPrice || 0), 0),
    };
  }, [games]);

  // ROI: is the sub paying for itself this year?
  const annualCost = SUBSCRIPTION_ANNUAL_COST[settings.psPlusTier];
  const roiMultiple = annualCost > 0 ? claimedValue.thisYearValue / annualCost : 0;

  // The single best match for the latest drop — the "Pick of the Month".
  const pickOfMonth = useMemo(() => {
    const latest = latestAvailableMonth();
    const pool = available.filter(r => r.catalogMonth === latest);
    const ranked = (pool.length ? pool : available).slice().sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
    return ranked[0] || null;
  }, [available]);

  // One-line, taste-aware read on the latest drop.
  const dropInsight = useMemo(() => {
    const latest = latestAvailableMonth();
    const pool = available.filter(r => r.catalogMonth === latest);
    if (pool.length === 0) return null;
    const top = new Set(tasteProfile.topGenres.map(g => g.toLowerCase()));
    const matches = pool.filter(r => r.genre && top.has(r.genre.toLowerCase())).length;
    const counts: Record<string, number> = {};
    for (const r of pool) if (r.genre) counts[r.genre] = (counts[r.genre] || 0) + 1;
    const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { dominantGenre: dom ? dom[0] : null, matches, total: pool.length };
  }, [available, tasteProfile]);

  // Games you OWN that are leaving the catalog this month — play before they go.
  const leavingSoon = useMemo(() => {
    const leaving = lastResult?.leaving || [];
    if (leaving.length === 0) return { owned: [] as Array<{ item: SubscriptionGameItem; game: Game }>, total: 0 };
    const ownedMap = new Map(games.filter(g => g.status !== 'Wishlist').map(g => [g.name.toLowerCase(), g]));
    const owned = leaving
      .map(item => ({ item, game: ownedMap.get(item.name.toLowerCase()) }))
      .filter((x): x is { item: SubscriptionGameItem; game: Game } => !!x.game);
    return { owned, total: leaving.length };
  }, [lastResult, games]);

  // Games already in your library that were actually PS Plus freebies we found,
  // but aren't tagged as free yet — offer to reclaim the savings.
  const reclaimable = useMemo(() => {
    const recByName = new Map<string, GameRecommendation>();
    for (const r of recs) if (!recByName.has(r.gameName.toLowerCase())) recByName.set(r.gameName.toLowerCase(), r);
    return games
      .filter(g => g.status !== 'Wishlist' && !(g.acquiredFree && g.subscriptionSource === SERVICE))
      .map(g => ({ game: g, rec: recByName.get(g.name.toLowerCase()) }))
      .filter((x): x is { game: Game; rec: GameRecommendation } => !!x.rec);
  }, [games, recs]);

  const newDrop = useMemo(() => computeHasNewDrop(settings), [settings]);

  return {
    settings,
    enabled: settings.psPlusEnabled,
    tier: settings.psPlusTier,
    setEnabled,
    setTier,

    loading,
    progress,
    error,
    lastResult,

    recs,
    available,
    monthlyAvailable,
    catalogAvailable,
    topPicks,
    saved,
    dismissed,
    months,
    claimedValue,
    annualCost,
    roiMultiple,
    pickOfMonth,
    dropInsight,
    leavingSoon,
    reclaimable,
    newDrop,
    latestMonth: latestAvailableMonth(),
    currentMonth: monthKey(),

    syncLatest,
    backfill,
    dismissNudge,
    markDismissed,
    undoDismiss,
    saveForLater,
    addToUpNext,
    addToWishlist,
    addAsPlayed,
    addAllTopPicksToUpNext,
    claimAllMonthly,
    reclaim,
    refresh,
  };
}
