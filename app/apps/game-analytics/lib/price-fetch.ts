'use client';

/**
 * Best-effort live price lookup via CheapShark (free, keyless, PC/Steam-centric).
 * Runs client-side from the user's browser, so it works regardless of how the
 * app is hosted. Console prices aren't covered — treat the result as a
 * "lowest PC price" reference point, not gospel.
 */

export interface FetchedPrice {
  price: number;       // rounded USD
  title: string;       // matched store title
  source: string;      // e.g. "CheapShark (PC)"
}

const CHEAPSHARK_GAMES = 'https://www.cheapshark.com/api/1.0/games';

interface CheapSharkGame {
  external: string;
  cheapest: string;
  cheapestDealID: string;
}

function bestMatch(name: string, results: CheapSharkGame[]): CheapSharkGame | null {
  if (results.length === 0) return null;
  const lower = name.trim().toLowerCase();
  const exact = results.find(r => r.external?.toLowerCase() === lower);
  if (exact) return exact;
  const startsWith = results.find(r => r.external?.toLowerCase().startsWith(lower));
  return startsWith ?? results[0];
}

export async function fetchCheapestPrice(name: string): Promise<FetchedPrice | null> {
  if (!name || name.trim().length < 2) return null;
  try {
    const url = `${CHEAPSHARK_GAMES}?title=${encodeURIComponent(name.trim())}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as CheapSharkGame[];
    if (!Array.isArray(data)) return null;
    const match = bestMatch(name, data);
    if (!match) return null;
    const cheapest = parseFloat(match.cheapest);
    if (isNaN(cheapest) || cheapest <= 0) return null;
    return {
      price: Math.round(cheapest),
      title: match.external,
      source: 'CheapShark (PC)',
    };
  } catch {
    // Network blocked, offline, or CORS — caller falls back to manual entry.
    return null;
  }
}
