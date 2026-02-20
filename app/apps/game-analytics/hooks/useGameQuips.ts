'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Game } from '../lib/types';
import { getTotalHours } from '../lib/calculations';
import { generateGameQuips, GameQuip } from '../lib/ai-quips-service';

const STORAGE_KEY = 'game-analytics-quips';
// Regenerate quip if hours changed by 5+ or rating changed, or it's 7+ days old
const STALENESS_HOURS_DELTA = 5;
const STALENESS_DAYS = 7;

type QuipsCache = Record<string, GameQuip>;

function loadCache(userId: string): QuipsCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${userId || 'local-user'}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(userId: string, cache: QuipsCache) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}-${userId || 'local-user'}`, JSON.stringify(cache));
}

function isStale(cached: GameQuip, game: Game): boolean {
  const hours = getTotalHours(game);
  const hoursDelta = Math.abs(hours - cached.hoursSnapshot);
  const ratingChanged = game.rating !== cached.ratingSnapshot;
  const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return hoursDelta >= STALENESS_HOURS_DELTA || ratingChanged || ageDays >= STALENESS_DAYS;
}

export function useGameQuips(games: Game[], userId: string | null) {
  const [quips, setQuips] = useState<QuipsCache>({});
  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);

  // Load cache from localStorage on mount / user change
  useEffect(() => {
    const cached = loadCache(userId || '');
    setQuips(cached);
  }, [userId]);

  const generateMissing = useCallback(async (gamesToProcess: Game[]) => {
    if (generatingRef.current || gamesToProcess.length === 0) return;
    generatingRef.current = true;
    setGenerating(true);

    try {
      const results = await generateGameQuips(gamesToProcess);
      const now = new Date().toISOString();

      setQuips(prev => {
        const next = { ...prev };
        for (const { id, quip } of results) {
          const game = gamesToProcess.find(g => g.id === id);
          if (!game) continue;
          next[id] = {
            id,
            quip,
            hoursSnapshot: getTotalHours(game),
            ratingSnapshot: game.rating,
            generatedAt: now,
          };
        }
        saveCache(userId || '', next);
        return next;
      });
    } catch {
      // Silently fail — fall back to rule-based whispers
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [userId]);

  // On games change, find stale/missing quips and generate them
  useEffect(() => {
    if (games.length === 0) return;

    const cache = loadCache(userId || '');
    const ownedGames = games.filter(g => g.status !== 'Wishlist');

    // Games that need a fresh quip (missing or stale)
    const needsQuip = ownedGames.filter(g => {
      const cached = cache[g.id];
      return !cached || isStale(cached, g);
    });

    if (needsQuip.length > 0) {
      // Batch in groups of 20 to keep prompts manageable
      const batches: Game[][] = [];
      for (let i = 0; i < needsQuip.length; i += 20) {
        batches.push(needsQuip.slice(i, i + 20));
      }
      // Generate first batch immediately, rest after a delay to not overwhelm
      batches.forEach((batch, i) => {
        setTimeout(() => generateMissing(batch), i * 3000);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length, userId]);

  return { quips, generating };
}
