'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Game, GameRecommendation, TasteProfile, RecommendationStatus } from '../lib/types';
import { recommendationRepository } from '../lib/recommendation-storage';
import { buildTasteProfile } from '../lib/calculations';
import { generateRecommendations, generateRefinedRecommendations, analyzeGameForUser, AIRecommendation, GameAnalysis } from '../lib/ai-recommendation-service';
import { searchRAWGGame } from '../lib/rawg-api';

export function useRecommendations(userId: string | null, games: Game[]) {
  const [recommendations, setRecommendations] = useState<GameRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

  // Derived lists
  const suggested = useMemo(() =>
    recommendations.filter(r => r.status === 'suggested'),
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

  const existingGameNames = useMemo(() => games.map(g => g.name), [games]);
  const dismissedNames = useMemo(() => dismissed.map(r => r.gameName), [dismissed]);
  const interestedNames = useMemo(() => interested.map(r => r.gameName), [interested]);

  // Enrich an AI recommendation with RAWG data and save it
  const enrichAndSave = useCallback(async (rec: AIRecommendation): Promise<GameRecommendation> => {
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
    });
  }, []);

  // Generate fresh recommendations
  const generate = useCallback(async (userPrompt?: string) => {
    if (games.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const aiRecs = interestedNames.length > 0
        ? await generateRefinedRecommendations(tasteProfile, games, existingGameNames, dismissedNames, interestedNames, userPrompt)
        : await generateRecommendations(tasteProfile, games, existingGameNames, dismissedNames, interestedNames, userPrompt);

      // Enrich with RAWG data and save each
      const saved = await Promise.all(aiRecs.map(enrichAndSave));
      setRecommendations(prev => [...saved, ...prev]);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
    } finally {
      setGenerating(false);
    }
  }, [games, tasteProfile, existingGameNames, dismissedNames, interestedNames, enrichAndSave]);

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
    loading,
    generating,
    analyzing,
    error,

    // Taste profile
    tasteProfile,
    autoProfile,
    profileOverrides,
    updateProfileOverrides,
    resetProfileOverrides,

    // Actions
    generate,
    analyzeGame,
    markInterested,
    markDismissed,
    markWishlisted,
    markPlayed,
    deleteRecommendation,
    undoDismiss,
    refresh,
  };
}
