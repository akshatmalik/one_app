/**
 * CheapShark API Integration
 * Free API for game deals across PC stores (Steam, GOG, Epic, Humble, etc.)
 * API Docs: https://apidocs.cheapshark.com/
 * No API key required.
 */

const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

export interface CheapSharkDeal {
  dealID: string;
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  metacriticScore: string;
  steamRatingText: string | null;
  steamRatingPercent: string;
  steamAppID: string | null;
  thumb: string;
  storeName?: string;
  storeID: string;
  dealRating: string;
  releaseDate: number;
}

interface CheapSharkStore {
  storeID: string;
  storeName: string;
  isActive: number;
}

let storeCache: Map<string, string> | null = null;

async function getStoreMap(): Promise<Map<string, string>> {
  if (storeCache) return storeCache;

  try {
    const response = await fetch(`${CHEAPSHARK_BASE}/stores`);
    if (!response.ok) return new Map();

    const stores: CheapSharkStore[] = await response.json();
    storeCache = new Map(stores.filter(s => s.isActive).map(s => [s.storeID, s.storeName]));
    return storeCache;
  } catch {
    return new Map();
  }
}

export interface DealSearchOptions {
  sortBy?: 'Deal Rating' | 'Title' | 'Savings' | 'Price' | 'Metacritic' | 'Reviews' | 'Release' | 'Store' | 'Recent';
  upperPrice?: number;
  lowerPrice?: number;
  metacritic?: number;
  steamRating?: number;
  onSale?: boolean;
  pageSize?: number;
  title?: string;
}

/**
 * Fetch game deals from CheapShark
 */
export async function fetchDeals(options: DealSearchOptions = {}): Promise<CheapSharkDeal[]> {
  try {
    const params = new URLSearchParams({
      pageSize: (options.pageSize || 20).toString(),
      onSale: options.onSale !== false ? '1' : '0',
    });

    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.upperPrice !== undefined) params.set('upperPrice', options.upperPrice.toString());
    if (options.lowerPrice !== undefined) params.set('lowerPrice', options.lowerPrice.toString());
    if (options.metacritic !== undefined) params.set('metacritic', options.metacritic.toString());
    if (options.steamRating !== undefined) params.set('steamRating', options.steamRating.toString());
    if (options.title) params.set('title', options.title);

    const url = `${CHEAPSHARK_BASE}/deals?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const deals: CheapSharkDeal[] = await response.json();

    // Enrich with store names
    const storeMap = await getStoreMap();
    return deals.map(deal => ({
      ...deal,
      storeName: storeMap.get(deal.storeID) || 'Unknown',
    }));
  } catch {
    return [];
  }
}

/**
 * Get the CheapShark deal link URL
 */
export function getDealLink(dealID: string): string {
  return `https://www.cheapshark.com/redirect?dealID=${dealID}`;
}
