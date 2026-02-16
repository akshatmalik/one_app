'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Game, GameRecommendation, TasteProfile, RecommendationStatus } from '../lib/types';
import { recommendationRepository } from '../lib/recommendation-storage';
import { buildTasteProfile, buildUpcomingFilters, scoreUpcomingMatch } from '../lib/calculations';
import {
  generateRefinedRecommendations,
  generateCategorizedRecommendations,
  analyzeGameForUser,
  scoreUpcomingGames,
  AIRecommendation,
  GameAnalysis,
} from '../lib/ai-recommendation-service';
import { searchRAWGGame, getUpcomingGames } from '../lib/rawg-api';

export function useRecommendations(userId: string | null, games: Game[]) {
  const [recommendations, setRecommendations] = useState<GameRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingUpcoming, setGeneratingUpcoming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Auto-computed taste profile from library data
  const autoProfile = useMemo(() => buildTasteProfile(games), [games]);

  // Profile overrides (user edits) — stored in localStorage
  const [profileOverrides, setProfileOverrides] = useState<Partial<TasteProfile>>({});

  // Merged profile = auto + user overrides
  const tasteProfile: TasteProfile = useMemo(() => ({
    ...autoProfile,
    ...profileOverrides,
    // Merge arrays intelligently — overrides replace, not merge
    topGenres: profileOverrides.topGenres || autoProfile.topGenres,
    avoidGenres: profileOverrides.avoidGenres || autoProfile.avoidGenres,
    platforms: profileOverrides.platforms || autoProfile.platforms,
  }), [autoProfile, profileOverrides]);

  // Set user ID on repository
  useEffect(() => {
    recommendationRepository.setUserId(userId || '');
  }, [userId]);

  // Load profile overrides from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `game-analytics-taste-overrides-${userId || 'local-user'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setProfileOverrides(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [userId]);

  // Save profile overrides
  const updateProfileOverrides = useCallback((overrides: Partial<TasteProfile>) => {
    setProfileOverrides(overrides);
    if (typeof window !== 'undefined') {
      const key = `game-analytics-taste-overrides-${userId || 'local-user'}`;
      localStorage.setItem(key, JSON.stringify(overrides));
    }
  }, [userId]);

  const resetProfileOverrides = useCallback(() => {
    setProfileOverrides({});
    if (typeof window !== 'undefined') {
      const key = `game-analytics-taste-overrides-${userId || 'local-user'}`;
      localStorage.removeItem(key);
    }
  }, [userId]);

  // Load saved recommendations
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await recommendationRepository.getAll();
      setRecommendations(data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, userId]);

  // Derived lists — released recommendations
  const suggested = useMemo(() =>
    recommendations.filter(r => r.status === 'suggested' && !r.isUpcoming),
    [recommendations]
  );
  const interested = useMemo(() =>
    recommendations.filter(r => r.status === 'interested'),
    [recommendations]
  );
  const dismissed = useMemo(() =>
    recommendations.filter(r => r.status === 'dismissed'),
    [recommendations]
  );
  const watching = useMemo(() =>
    recommendations.filter(r => r.status === 'watching'),
    [recommendations]
  );

  // Derived lists — upcoming recommendations
  const upcomingSuggested = useMemo(() =>
    recommendations.filter(r => r.isUpcoming && (r.status === 'suggested' || r.status === 'watching')),
    [recommendations]
  );
  const upcomingThisMonth = useMemo(() =>
    upcomingSuggested.filter(r => r.releaseWindow === 'this-month'),
    [upcomingSuggested]
  );
  const upcomingNextFewMonths = useMemo(() =>
    upcomingSuggested.filter(r => r.releaseWindow === 'next-few-months'),
    [upcomingSuggested]
  );
  const upcomingLater = useMemo(() =>
    upcomingSuggested.filter(r => r.releaseWindow === 'later'),
    [upcomingSuggested]
  );

  // Categorized released recommendations
  const categorizedSuggested = useMemo(() => {
    const cats: Record<string, GameRecommendation[]> = {};
    for (const rec of suggested) {
      const cat = rec.recommendationCategory || 'general';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(rec);
    }
    return cats;
  }, [suggested]);

  const existingGameNames = useMemo(() => games.map(g => g.name), [games]);
  const dismissedNames = useMemo(() => dismissed.map(r => r.gameName), [dismissed]);
  const interestedNames = useMemo(() => interested.map(r => r.gameName), [interested]);

  // Enrich an AI recommendation with RAWG data and save it
  const enrichAndSave = useCallback(async (rec: AIRecommendation, extra?: Partial<GameRecommendation>): Promise<GameRecommendation> => {
    const rawgData = await searchRAWGGame(rec.gameName);
    return recommendationRepository.create({
      gameName: rec.gameName,
      genre: rec.genre,
      platform: rec.platform,
      thumbnail: rawgData?.backgroundImage || undefined,
      metacritic: rawgData?.metacritic || undefined,
      rawgRating: rawgData?.rating || undefined,
      releaseDate: rawgData?.released || undefined,
      aiReason: rec.reason,
      status: 'suggested',
      suggestedAt: new Date().toISOString(),
      ...extra,
    });
  }, []);

  // Generate fresh released recommendations (with categories)
  const generate = useCallback(async (userPrompt?: string) => {
    if (games.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      let saved: GameRecommendation[];

      if (interestedNames.length > 0 && !userPrompt) {
        // Refined recommendations based on interest signals
        const aiRecs = await generateRefinedRecommendations(tasteProfile, games, existingGameNames, dismissedNames, interestedNames, userPrompt);
        saved = await Promise.all(aiRecs.map(r => enrichAndSave(r)));
      } else {
        // Categorized recommendations
        const aiRecs = await generateCategorizedRecommendations(tasteProfile, games, existingGameNames, dismissedNames, interestedNames, userPrompt);
        saved = await Promise.all(aiRecs.map(r => enrichAndSave(r, {
          recommendationCategory: r.category,
          categoryContext: r.categoryContext,
        })));
      }

      setRecommendations(prev => [...saved, ...prev]);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
    } finally {
      setGenerating(false);
    }
  }, [games, tasteProfile, existingGameNames, dismissedNames, interestedNames, enrichAndSave]);

  // Generate upcoming game recommendations
  const generateUpcoming = useCallback(async () => {
    if (games.length === 0) return;
    setGeneratingUpcoming(true);
    setError(null);
    try {
      const filters = buildUpcomingFilters(tasteProfile);
      const ownedNames = games.map(g => g.name);
      const alreadyUpcomingNames = upcomingSuggested.map(r => r.gameName.toLowerCase());

      // Fetch upcoming games from RAWG
      const { thisMonth, nextFewMonths, later } = await getUpcomingGames(filters, ownedNames);

      // Combine all and filter out already-suggested
      const allUpcoming = [
        ...thisMonth.map(g => ({ ...g, window: 'this-month' as const })),
        ...nextFewMonths.map(g => ({ ...g, window: 'next-few-months' as const })),
        ...later.map(g => ({ ...g, window: 'later' as const })),
      ].filter(g => !alreadyUpcomingNames.includes(g.name.toLowerCase()));

      if (allUpcoming.length === 0) {
        setGeneratingUpcoming(false);
        return;
      }

      // Try AI scoring, fall back to local heuristic
      let scores: Array<{ gameName: string; hypeScore: number; reason: string }> = [];
      try {
        const aiScores = await scoreUpcomingGames(
          allUpcoming.map(g => ({
            name: g.name,
            metacritic: g.metacritic,
            rating: g.rating,
            released: g.released,
          })),
          tasteProfile,
          games
        );
        scores = aiScores;
      } catch {
        // Fallback to local scoring
        scores = allUpcoming.map(g => {
          const s = scoreUpcomingMatch(g.name, undefined, g.rating, g.metacritic, tasteProfile);
          return { gameName: g.name, hypeScore: s.score, reason: s.reason };
        });
      }

      // Merge scores with game data and save
      const saved: GameRecommendation[] = [];
      for (const game of allUpcoming) {
        const scoreEntry = scores.find(s => s.gameName.toLowerCase() === game.name.toLowerCase());
        const hypeScore = scoreEntry?.hypeScore || 5;
        const reason = scoreEntry?.reason || 'Matches your gaming profile.';

        // Only save games with score >= 4 to avoid noise
        if (hypeScore < 4) continue;

        const rec = await recommendationRepository.create({
          gameName: game.name,
          thumbnail: game.backgroundImage || undefined,
          metacritic: game.metacritic || undefined,
          rawgRating: game.rating || undefined,
          releaseDate: game.released || undefined,
          aiReason: reason,
          status: 'suggested',
          isUpcoming: true,
          releaseWindow: game.window,
          hypeScore,
          suggestedAt: new Date().toISOString(),
        });
        saved.push(rec);
      }

      setRecommendations(prev => [...saved, ...prev]);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
    } finally {
      setGeneratingUpcoming(false);
    }
  }, [games, tasteProfile, upcomingSuggested]);

  // "Would I like this game?" analysis
  const analyzeGame = useCallback(async (gameName: string): Promise<GameAnalysis> => {
    setAnalyzing(true);
    setError(null);
    try {
      return await analyzeGameForUser(gameName, tasteProfile, games, existingGameNames, interestedNames);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return { wouldLike: false, confidence: 0, reason: err.message, concerns: '' };
    } finally {
      setAnalyzing(false);
    }
  }, [tasteProfile, games, existingGameNames, interestedNames]);

  // Update recommendation status
  const updateStatus = useCallback(async (id: string, status: RecommendationStatus) => {
    try {
      await recommendationRepository.update(id, {
        status,
        respondedAt: new Date().toISOString(),
      });
      setRecommendations(prev =>
        prev.map(r => r.id === id ? { ...r, status, respondedAt: new Date().toISOString() } : r)
      );
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  const markInterested = useCallback((id: string) => updateStatus(id, 'interested'), [updateStatus]);
  const markWatching = useCallback((id: string) => updateStatus(id, 'watching'), [updateStatus]);
  const markDismissed = useCallback((id: string) => updateStatus(id, 'dismissed'), [updateStatus]);
  const markWishlisted = useCallback((id: string) => updateStatus(id, 'wishlisted'), [updateStatus]);
  const markPlayed = useCallback((id: string) => updateStatus(id, 'played'), [updateStatus]);

  const deleteRecommendation = useCallback(async (id: string) => {
    try {
      await recommendationRepository.delete(id);
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  // Undo dismiss (move back to suggested)
  const undoDismiss = useCallback((id: string) => updateStatus(id, 'suggested'), [updateStatus]);

  return {
    // Data
    recommendations,
    suggested,
    interested,
    dismissed,
    watching,
    loading,
    generating,
    generatingUpcoming,
    analyzing,
    error,

    // Upcoming
    upcomingSuggested,
    upcomingThisMonth,
    upcomingNextFewMonths,
    upcomingLater,

    // Categorized
    categorizedSuggested,

    // Taste profile
    tasteProfile,
    autoProfile,
    profileOverrides,
    updateProfileOverrides,
    resetProfileOverrides,

    // Actions
    generate,
    generateUpcoming,
    analyzeGame,
    markInterested,
    markWatching,
    markDismissed,
    markWishlisted,
    markPlayed,
    deleteRecommendation,
    undoDismiss,
    refresh,
  };
}
