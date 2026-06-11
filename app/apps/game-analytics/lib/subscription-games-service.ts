'use client';

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';
import { SubscriptionTier, SubscriptionBucket } from './types';
import { monthLabel } from './subscription-settings';

const firebaseConfig = {
  apiKey: "AIzaSyBS3IVvszDrm_zjjXu8TATgs1H-FlegHtM",
  authDomain: "oneapp-943e3.firebaseapp.com",
  projectId: "oneapp-943e3",
  storageBucket: "oneapp-943e3.firebasestorage.app",
  messagingSenderId: "1052736128978",
  appId: "1:1052736128978:web:9d42b47c6a343eac35aa0b",
};

// Grounded model — uses Google Search so it can find the real PS Plus lineup
// for a given month and cite the post it pulled it from.
function getGroundedModel() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }],
  } as Parameters<typeof getGenerativeModel>[1]);
}

export interface SubscriptionGameItem {
  name: string;
  genre?: string;
  platform?: string;
  bucket: SubscriptionBucket;
  estimatedPrice?: number;
}

export interface SubscriptionSource {
  uri: string;
  title: string;
}

export interface MonthlyDropResult {
  month: string;                 // 'YYYY-MM'
  games: SubscriptionGameItem[];
  leaving: SubscriptionGameItem[];     // games rotating OUT of the catalog this month
  primarySource?: SubscriptionSource;  // best post to cite
  sources: SubscriptionSource[];       // all grounding sources surfaced
}

// Pull the web sources Gemini grounded its answer on out of the response.
// The grounding metadata isn't in the SDK's public typings, so we read it
// defensively.
function extractSources(response: unknown): SubscriptionSource[] {
  try {
    const candidates = (response as { candidates?: Array<{ groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    } }> }).candidates;
    const chunks = candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources: SubscriptionSource[] = [];
    for (const c of chunks) {
      const uri = c.web?.uri;
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      sources.push({ uri, title: c.web?.title || uri });
    }
    return sources;
  } catch {
    return [];
  }
}

// Prefer an authoritative gaming source as the headline citation.
function pickPrimarySource(sources: SubscriptionSource[]): SubscriptionSource | undefined {
  if (sources.length === 0) return undefined;
  const priority = ['playstation.com', 'blog.playstation', 'pushsquare', 'ign.com', 'gamespot', 'eurogamer'];
  for (const host of priority) {
    const hit = sources.find(s => (s.title + ' ' + s.uri).toLowerCase().includes(host));
    if (hit) return hit;
  }
  return sources[0];
}

// ── Local cache ───────────────────────────────────────────────────────────
// A month's PS Plus lineup is final once it's out and never changes, so we
// cache successful pulls in localStorage and reuse them instead of re-running
// the grounded search every time the user syncs/backfills. Empty pulls are NOT
// cached, so "try again" can re-search a month we couldn't confirm.
const DROPS_CACHE_PREFIX = 'ga-psplus-drops-';
const DROPS_CACHE_TTL = 365 * 24 * 60 * 60 * 1000; // 1 year (effectively permanent)

interface DropsCacheEntry {
  result: MonthlyDropResult;
  timestamp: number;
}

function dropsCacheKey(tier: SubscriptionTier, month: string): string {
  return `${DROPS_CACHE_PREFIX}${tier}-${month}`;
}

function getDropsFromCache(tier: SubscriptionTier, month: string): MonthlyDropResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(dropsCacheKey(tier, month));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DropsCacheEntry;
    if (Date.now() - parsed.timestamp < DROPS_CACHE_TTL) return parsed.result;
    localStorage.removeItem(dropsCacheKey(tier, month));
    return null;
  } catch {
    return null;
  }
}

function saveDropsToCache(tier: SubscriptionTier, month: string, result: MonthlyDropResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(dropsCacheKey(tier, month), JSON.stringify({ result, timestamp: Date.now() }));
  } catch {
    /* quota / disabled storage — fine, just skip caching */
  }
}

/** Read a cached lineup without searching (used to restore state on mount). */
export function getCachedDrops(tier: SubscriptionTier, month: string): MonthlyDropResult | null {
  return getDropsFromCache(tier, month);
}

/** Wipe cached lineups (e.g. to force a fresh search). */
export function clearDropsCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DROPS_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Search the web (via Gemini grounding) for the PlayStation Plus lineup for a
 * given month and tier. Returns the games plus the sources it used so the UI
 * can show "powered by <post>".
 */
export async function fetchMonthlyDrops(
  tier: SubscriptionTier,
  month: string,
  opts?: { force?: boolean },
): Promise<MonthlyDropResult> {
  // Reuse the cached lineup unless a fresh search was explicitly requested.
  if (!opts?.force) {
    const cached = getDropsFromCache(tier, month);
    if (cached) return cached;
  }

  const model = getGroundedModel();
  const label = monthLabel(month);

  const tierAsk =
    tier === 'Essential'
      ? `List the PS Plus MONTHLY GAMES for ${label} (the "Monthly Games" every PS Plus member can claim). Put these in "monthly". Leave "catalog" and "leaving" empty.`
      : `List:
1. The PS Plus MONTHLY GAMES for ${label} (claim-to-keep Monthly Games every member gets) — put in "monthly".
2. The games ADDED to the PlayStation Plus Game Catalog (the ${tier} tier library) in ${label} — put in "catalog".
3. The games LEAVING / being REMOVED from the PlayStation Plus Game Catalog in ${label}, if announced — put in "leaving".`;

  const prompt = `Search the web for the PlayStation Plus lineup for ${label}. Use authoritative, up-to-date sources (PlayStation Blog, Push Square, IGN).

${tierAsk}

For each game include its genre and main platform if known, and an estimated full retail price in USD (estimatedPrice, a number — use your best estimate, e.g. 59.99, 19.99).

Only include games actually confirmed for ${label}. Do not invent titles. If you cannot confirm the lineup for ${label}, return empty arrays.

Respond with ONLY this JSON, nothing else:
{
  "monthly": [ { "name": "Game", "genre": "Genre", "platform": "PS5", "estimatedPrice": 59.99 } ],
  "catalog": [ { "name": "Game", "genre": "Genre", "platform": "PS5", "estimatedPrice": 39.99 } ],
  "leaving": [ { "name": "Game", "genre": "Genre", "platform": "PS5", "estimatedPrice": 19.99 } ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const sources = extractSources(result.response);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { month, games: [], leaving: [], sources, primarySource: pickPrimarySource(sources) };
  }

  let parsed: { monthly?: unknown[]; catalog?: unknown[]; leaving?: unknown[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { month, games: [], leaving: [], sources, primarySource: pickPrimarySource(sources) };
  }

  const toItems = (arr: unknown[] | undefined, bucket: SubscriptionBucket): SubscriptionGameItem[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map(raw => {
        const g = raw as Record<string, unknown>;
        const name = typeof g.name === 'string' ? g.name.trim() : '';
        if (!name) return null;
        return {
          name,
          genre: typeof g.genre === 'string' ? g.genre : undefined,
          platform: typeof g.platform === 'string' ? g.platform : undefined,
          estimatedPrice: num(g.estimatedPrice),
          bucket,
        } as SubscriptionGameItem;
      })
      .filter((x): x is SubscriptionGameItem => x !== null);
  };

  // Dedupe within the result (a game shouldn't appear in both buckets).
  const monthly = toItems(parsed.monthly, 'monthly');
  const monthlyNames = new Set(monthly.map(g => g.name.toLowerCase()));
  const catalog = toItems(parsed.catalog, 'catalog').filter(g => !monthlyNames.has(g.name.toLowerCase()));
  const leaving = toItems(parsed.leaving, 'catalog');

  const dropResult: MonthlyDropResult = {
    month,
    games: [...monthly, ...catalog],
    leaving,
    sources,
    primarySource: pickPrimarySource(sources),
  };

  // Only cache confirmed (non-empty) lineups so empty pulls stay retryable.
  if (dropResult.games.length > 0) saveDropsToCache(tier, month, dropResult);

  return dropResult;
}
