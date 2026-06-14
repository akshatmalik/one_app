// ──────────────────────────────────────────────────────────────────────────
// NewIdeas100-June2026 — #101 "Try This" feature-discovery system.
// A registry of features, each with a short friendly blurb (this is also how
// #102 is honored: every new feature registers a discovery blurb here). The
// prompt rotates through features the user hasn't dismissed/seen yet.
// ──────────────────────────────────────────────────────────────────────────

export interface DiscoverableFeature {
  id: string;
  blurb: string;     // Friendly nudge shown to the user
  tab?: string;      // Optional tab to deep-link to (tabMode value)
  cta?: string;      // Optional call-to-action label
}

// Keep this list growing as features ship — that's the #102 standing rule.
export const DISCOVERABLE_FEATURES: DiscoverableFeature[] = [
  { id: 'surprise-me', blurb: 'Tap "Surprise me" in Stats for a random delight — your gaming spirit animal, a restaurant review of your library, and more.', tab: 'stats', cta: 'Open Stats' },
  { id: 'regret-refund', blurb: 'See the Regret Refund Estimator in Stats — the money tied up in games you barely touched.', tab: 'stats', cta: 'Open Stats' },
  { id: 'personal-records', blurb: 'Check your Personal Records in Stats: longest session, best value, fastest finish — your gaming world records.', tab: 'stats', cta: 'Open Stats' },
  { id: 'heat-calendar', blurb: 'Your Session Heat Calendar in Stats shows a full year of gaming days at a glance.', tab: 'stats', cta: 'Open Stats' },
  { id: 'the-vault', blurb: 'The Vault in Stats resurfaces owned games gathering dust — rediscover one this week.', tab: 'stats', cta: 'Open Stats' },
  { id: 'buy-next', blurb: 'Wondering what to buy next? Stats shows the kinds of games that earn your highest satisfaction.', tab: 'stats', cta: 'Open Stats' },
  { id: 'taste-twins', blurb: 'Taste Twin Genres in Stats reveals which genres you secretly treat exactly alike.', tab: 'stats', cta: 'Open Stats' },
  { id: 'genre-goal', blurb: 'Set a Genre Goal in Stats and track how many different genres you play this year.', tab: 'stats', cta: 'Open Stats' },
  { id: 'pin-favorites', blurb: 'Editing a game lets you Pin it to the top of your list — handy for your current obsession.' },
  { id: 'gut-verdict', blurb: 'When editing a game, set "Your Gut Verdict" (worth it / regret) to override the value math with how you actually feel.' },
  { id: 'tags', blurb: 'Add Tags like "co-op" or "comfort" when editing a game, then search by them.' },
  { id: 'quick-add', blurb: 'In a hurry? Hit "Paste" up top to add a whole list of games at once, one per line.' },
  { id: 'compare-periods', blurb: 'Compare Periods in Stats pits this month vs last (or year vs year) with up/down arrows.', tab: 'stats', cta: 'Open Stats' },
  { id: 'ai-companion', blurb: 'The AI Companion in Stats will roast your library, read your gaming horoscope, and forecast tonight’s session.', tab: 'stats', cta: 'Open Stats' },
  { id: 'beat-the-clock', blurb: 'Set a finish-by Deadline when editing a game — Stats shows whether you’re on track to beat it.', tab: 'stats', cta: 'Open Stats' },
];

const SEEN_KEY = 'ga-feature-discovery-seen';
const DISMISSED_KEY = 'ga-feature-discovery-dismissed';

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore quota errors */
  }
}

export function markFeatureSeen(id: string): void {
  const seen = readSet(SEEN_KEY);
  seen.add(id);
  writeSet(SEEN_KEY, seen);
}

export function dismissFeature(id: string): void {
  const dismissed = readSet(DISMISSED_KEY);
  dismissed.add(id);
  writeSet(DISMISSED_KEY, dismissed);
}

/**
 * Pick the next feature to surface: prefer never-seen, fall back to seen-but-
 * not-dismissed, and skip dismissed entirely. Returns null when nothing's left.
 */
export function pickNextFeature(): DiscoverableFeature | null {
  const seen = readSet(SEEN_KEY);
  const dismissed = readSet(DISMISSED_KEY);
  const available = DISCOVERABLE_FEATURES.filter((f) => !dismissed.has(f.id));
  if (!available.length) return null;
  const unseen = available.filter((f) => !seen.has(f.id));
  const pool = unseen.length ? unseen : available;
  // Rotate by day so it changes but stays stable within a session/day.
  const dayIndex = Math.floor(Date.now() / 86400_000);
  return pool[dayIndex % pool.length];
}
