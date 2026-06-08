export interface WikipediaViewResult {
  slug: string;
  dailyAvg: number | null;
  error?: string;
}

// Fetches average daily pageviews over the last 30 days
export async function fetchWikipediaViews(slug: string): Promise<WikipediaViewResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(slug)}/daily/${fmt(start)}/${fmt(end)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Api-User-Agent': 'game-interest-tracker/1.0' },
    });

    if (!res.ok) {
      return { slug, dailyAvg: null, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const items: { views: number }[] = data.items ?? [];
    if (items.length === 0) return { slug, dailyAvg: null, error: 'No data' };

    const total = items.reduce((sum, i) => sum + i.views, 0);
    return { slug, dailyAvg: Math.round(total / items.length) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { slug, dailyAvg: null, error: msg };
  }
}

export async function fetchAllWikipediaViews(
  slugs: string[]
): Promise<WikipediaViewResult[]> {
  return Promise.all(slugs.map(fetchWikipediaViews));
}
