'use client';

import { useMemo, useState } from 'react';
import {
  Gift, Loader2, Sparkles, Flame, Check, X, Bookmark, Play, ListPlus,
  ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Undo2, PiggyBank,
  Crown, Clock, ShoppingCart, LogOut, RefreshCw, TrendingUp, Search,
} from 'lucide-react';
import { Game, GameRecommendation, SubscriptionTier } from '../lib/types';
import { useSubscriptionGames } from '../hooks/useSubscriptionGames';
import { usePurchaseQueue } from '../hooks/usePurchaseQueue';
import { monthLabel, monthlyClaimDeadline, latestAvailableMonth } from '../lib/subscription-settings';
import clsx from 'clsx';

interface SubscriptionDropPanelProps {
  games: Game[];
  userId: string | null;
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  onAddToQueue: (gameId: string) => Promise<void>;
  onUpdateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
}

const TIERS: { id: SubscriptionTier; label: string; blurb: string }[] = [
  { id: 'Essential', label: 'Essential', blurb: 'Monthly games' },
  { id: 'Extra', label: 'Extra', blurb: 'Monthly + Game Catalog' },
  { id: 'Premium', label: 'Premium', blurb: 'Everything + Classics' },
];

const BACKFILL_OPTIONS = [3, 6, 12, 24, 36, 60];

function backfillLabel(months: number): string {
  if (months < 12) return `last ${months} mo`;
  const years = months / 12;
  return `last ${years} ${years === 1 ? 'yr' : 'yrs'}`;
}

type SortMode = 'match' | 'metacritic' | 'newest';
type BucketFilter = 'all' | 'monthly' | 'catalog';

export function SubscriptionDropPanel({ games, userId, onAddGame, onAddToQueue, onUpdateGame }: SubscriptionDropPanelProps) {
  const sub = useSubscriptionGames({ userId, games, onAddGame, onAddToQueue, onUpdateGame });
  const { entries: buyEntries, deleteEntry: deleteBuyEntry } = usePurchaseQueue(userId);

  const [backfillMonths, setBackfillMonths] = useState(6);
  const [showDismissed, setShowDismissed] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('match');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const syncing = sub.progress.active;
  const latestMonth = latestAvailableMonth();

  // Headline citation: latest sync result, else the most recent saved rec's source.
  const citation = sub.lastResult?.primarySource
    || (sub.recs.find(r => r.sourceUrl) ? { uri: sub.recs.find(r => r.sourceUrl)!.sourceUrl!, title: sub.recs.find(r => r.sourceTitle)?.sourceTitle || 'source' } : null);

  // #1 — games you're planning to buy (Buy Queue, not purchased) or wishlisting
  // that are free this month. Map by lowercased name.
  const buyMap = useMemo(() => {
    const m = new Map<string, { id: string; price: number }>();
    for (const e of buyEntries) {
      if (e.purchased) continue;
      m.set(e.gameName.toLowerCase(), { id: e.id, price: e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 0 });
    }
    return m;
  }, [buyEntries]);
  const wishlistSet = useMemo(
    () => new Set(games.filter(g => g.status === 'Wishlist').map(g => g.name.toLowerCase())),
    [games],
  );
  const overlapFor = (rec: GameRecommendation) => {
    const name = rec.gameName.toLowerCase();
    const buy = buyMap.get(name);
    return { buyId: buy?.id, onList: !!buy || wishlistSet.has(name) };
  };
  const overlaps = useMemo(
    () => sub.available.filter(r => overlapFor(r).onList),
    [sub.available, buyMap, wishlistSet], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const overlapSavings = overlaps.reduce((s, r) => s + (r.estimatedPrice || 0), 0);

  // Search across name, genre, platform, and the drop's month — lets you find
  // a specific game once you've backfilled many months of drops.
  const search = searchQuery.trim().toLowerCase();
  const matchesSearch = (rec: GameRecommendation): boolean => {
    if (!search) return true;
    return (
      rec.gameName.toLowerCase().includes(search) ||
      (!!rec.genre && rec.genre.toLowerCase().includes(search)) ||
      (!!rec.platform && rec.platform.toLowerCase().includes(search)) ||
      (!!rec.catalogMonth && monthLabel(rec.catalogMonth).toLowerCase().includes(search))
    );
  };

  // Sorted + filtered available grid (Pick of the Month is shown separately).
  const gridGames = useMemo(() => {
    let list = sub.available.filter(r => r.id !== sub.pickOfMonth?.id);
    if (bucketFilter === 'monthly') list = list.filter(r => r.subscriptionBucket === 'monthly');
    if (bucketFilter === 'catalog') list = list.filter(r => r.subscriptionBucket !== 'monthly');
    if (search) list = list.filter(matchesSearch);
    const sorted = [...list];
    if (sortMode === 'match') sorted.sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
    if (sortMode === 'metacritic') sorted.sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0));
    if (sortMode === 'newest') sorted.sort((a, b) => (b.catalogMonth || '').localeCompare(a.catalogMonth || ''));
    return sorted;
  }, [sub.available, sub.pickOfMonth, bucketFilter, sortMode, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickOfMonthMatches = !sub.pickOfMonth || matchesSearch(sub.pickOfMonth);
  const filteredSaved = useMemo(() => sub.saved.filter(matchesSearch), [sub.saved, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredDismissed = useMemo(() => sub.dismissed.filter(matchesSearch), [sub.dismissed, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const claimByFor = (rec: GameRecommendation): string | undefined => {
    if (rec.subscriptionBucket !== 'monthly' || rec.catalogMonth !== latestMonth) return undefined;
    const d = monthlyClaimDeadline(rec.catalogMonth);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // ── Not configured yet — intro / enable ──────────────────────────────────
  if (!sub.enabled) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/15 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <Gift size={22} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Track your PS Plus free games</h3>
            <p className="text-white/40 text-xs mt-1 max-w-md mx-auto leading-relaxed">
              Each month, AI searches the web for the PlayStation Plus lineup — the monthly games and (on Extra/Premium)
              the Game Catalog additions — cites the post it used, ranks them against your taste, and lets you add the
              ones you want to Up Next or your library.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-white/30">Your tier</div>
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              {TIERS.map(t => (
                <button
                  key={t.id}
                  onClick={() => sub.setTier(t.id)}
                  className={clsx(
                    'rounded-xl px-2 py-2.5 text-xs font-medium border transition-all',
                    sub.tier === t.id
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
                      : 'bg-white/[0.03] text-white/40 border-white/5 hover:text-white/60'
                  )}
                >
                  {t.label}
                  <div className="text-[9px] text-white/30 font-normal mt-0.5">{t.blurb}</div>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => sub.setEnabled(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 transition-colors border border-indigo-500/20"
          >
            Enable PS Plus tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Error */}
      {sub.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <pre className="text-[10px] text-red-300/70 whitespace-pre-wrap break-all">{sub.error.message}</pre>
        </div>
      )}

      {/* Config + ROI header */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-indigo-300" />
            <span className="text-sm font-semibold text-white">PS Plus Free Games</span>
          </div>
          <button onClick={() => sub.setEnabled(false)} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">
            Turn off
          </button>
        </div>

        {/* Tier selector */}
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => sub.setTier(t.id)}
              className={clsx(
                'rounded-lg px-2 py-1.5 text-[11px] font-medium border transition-all',
                sub.tier === t.id
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
                  : 'bg-white/[0.02] text-white/35 border-white/5 hover:text-white/55'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* #2 — ROI meter */}
        {sub.claimedValue.count > 0 && (
          <div className="bg-emerald-500/[0.06] rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-emerald-300/80">
              <PiggyBank size={14} className="text-emerald-400" />
              <span>
                <strong className="text-emerald-200">{sub.claimedValue.count}</strong> games claimed, worth{' '}
                <strong className="text-emerald-200">${Math.round(sub.claimedValue.value)}</strong>
                {sub.claimedValue.thisYearValue > 0 && <> · ${Math.round(sub.claimedValue.thisYearValue)} this year</>}
              </span>
            </div>
            {sub.roiMultiple > 0 && (
              <>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', sub.roiMultiple >= 1 ? 'bg-emerald-400' : 'bg-amber-400')}
                    style={{ width: `${Math.min(100, sub.roiMultiple * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/40">
                  {sub.roiMultiple >= 1
                    ? `Your ${sub.tier} sub paid for itself ${sub.roiMultiple.toFixed(1)}× over this year ($${sub.annualCost}/yr).`
                    : `${Math.round(sub.roiMultiple * 100)}% of your $${sub.annualCost}/yr ${sub.tier} sub recouped so far this year.`}
                </div>
              </>
            )}
          </div>
        )}

        {/* Sync controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sub.syncLatest}
            disabled={syncing}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              syncing ? 'bg-white/5 text-white/25 cursor-not-allowed' : 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 border border-indigo-500/15')}
          >
            {syncing && sub.progress.total === 1 ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Find {monthLabel(sub.latestMonth)}
          </button>
          <div className="flex items-center gap-1.5">
            <select
              value={backfillMonths}
              onChange={(e) => setBackfillMonths(Number(e.target.value))}
              disabled={syncing}
              className="bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/70 px-2 py-2 outline-none [color-scheme:dark]"
            >
              {BACKFILL_OPTIONS.map(n => <option key={n} value={n}>{backfillLabel(n)}</option>)}
            </select>
            <button
              onClick={() => sub.backfill(backfillMonths)}
              disabled={syncing}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                syncing ? 'bg-white/5 text-white/25 cursor-not-allowed' : 'bg-white/[0.04] text-white/55 hover:text-white/80 border border-white/5')}
            >
              {syncing && sub.progress.total > 1 ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
              Backfill
            </button>
          </div>
        </div>

        {!syncing && backfillMonths >= 24 && (
          <p className="text-[10px] text-white/30">
            Backfilling {backfillLabel(backfillMonths).replace('last ', '')} runs {backfillMonths} searches — it&apos;ll take a few minutes.
          </p>
        )}

        {syncing && (
          <div className="text-[11px] text-white/40">
            Searching {monthLabel(sub.progress.current)}{sub.progress.total > 1 && ` (${sub.progress.done + 1}/${sub.progress.total})`}…
          </div>
        )}

        {/* #8 — taste-aware drop insight */}
        {sub.dropInsight && sub.dropInsight.dominantGenre && (
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-200/70">
            <TrendingUp size={12} className="text-indigo-300" />
            {monthLabel(latestMonth)} leans <strong className="text-indigo-100">{sub.dropInsight.dominantGenre}</strong>
            {sub.dropInsight.matches > 0
              ? <> — {sub.dropInsight.matches} match your top genres</>
              : <> — a bit outside your usual taste</>}
          </div>
        )}

        {/* #9 — citation + receipts */}
        {citation && (
          <div className="space-y-1">
            <a href={citation.uri} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-indigo-300 transition-colors">
              <ExternalLink size={10} /> Powered by: {citation.title}
            </a>
            {sub.lastResult && sub.lastResult.sources.length > 1 && (
              <>
                <button onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/45 transition-colors">
                  {showSources ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  Sources ({sub.lastResult.sources.length})
                </button>
                {showSources && (
                  <div className="space-y-0.5 pl-3">
                    {sub.lastResult.sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                        className="block text-[10px] text-white/25 hover:text-indigo-300 truncate transition-colors">
                        · {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {sub.lastResult && sub.lastResult.games.length === 0 && !syncing && (
          <p className="text-[11px] text-white/35">
            Couldn&apos;t confirm the {monthLabel(sub.lastResult.month)} lineup from a reliable source. Try again, or add games manually.
          </p>
        )}
      </div>

      {/* #1 — Don't buy it, it's free! */}
      {overlaps.length > 0 && (
        <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-amber-200 font-medium">
            <ShoppingCart size={15} className="text-amber-400" />
            Don&apos;t buy these — they&apos;re free right now
          </div>
          <p className="text-[11px] text-amber-200/70">
            {overlaps.length} {overlaps.length === 1 ? 'game' : 'games'} on your buy/wishlist are free on PS Plus
            {overlapSavings > 0 && <> — could save ~${Math.round(overlapSavings)}</>}.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overlaps.map(r => (
              <span key={r.id} className="text-[11px] text-amber-100/90 bg-amber-500/10 rounded-lg px-2 py-1">{r.gameName}</span>
            ))}
          </div>
        </div>
      )}

      {/* #4 — Leaving Soon (games you own) */}
      {sub.leavingSoon.owned.length > 0 && (
        <div className="bg-rose-500/[0.07] border border-rose-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-rose-200 font-medium">
            <LogOut size={15} className="text-rose-400" />
            Leaving the catalog soon
          </div>
          <p className="text-[11px] text-rose-200/70">
            {sub.leavingSoon.owned.length} {sub.leavingSoon.owned.length === 1 ? 'game' : 'games'} in your library
            {sub.leavingSoon.owned.length === 1 ? ' is' : ' are'} rotating out — play before {sub.leavingSoon.owned.length === 1 ? 'it' : 'they'}&apos;re gone.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sub.leavingSoon.owned.map(({ game }) => (
              <span key={game.id} className="text-[11px] text-rose-100/90 bg-rose-500/10 rounded-lg px-2 py-1">{game.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* #5 — Reclaim owned freebies */}
      {sub.reclaimable.length > 0 && (
        <div className="bg-cyan-500/[0.06] border border-cyan-500/15 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-cyan-200 font-medium">
            <RefreshCw size={14} className="text-cyan-400" />
            Claim savings on games you already own
          </div>
          <p className="text-[11px] text-cyan-200/70">
            These were PS Plus freebies — tag them to credit the savings.
          </p>
          <div className="space-y-1.5">
            {sub.reclaimable.slice(0, 6).map(({ game, rec }) => (
              <div key={game.id} className="flex items-center justify-between gap-2 bg-cyan-500/[0.05] rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] text-cyan-100/90 truncate">
                  {game.name}{rec.estimatedPrice ? <span className="text-cyan-300/60"> · ${Math.round(rec.estimatedPrice)}</span> : null}
                </span>
                <button onClick={() => sub.reclaim(game.id, rec)}
                  className="shrink-0 text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 rounded px-2 py-1 transition-colors">
                  It was free
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* #3 — Pick of the Month */}
      {sub.pickOfMonth && pickOfMonthMatches && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Crown size={13} className="text-amber-400" />
            <h3 className="text-xs font-medium text-white/60">Pick of the Month</h3>
          </div>
          <SubscriptionGameCard
            rec={sub.pickOfMonth} sub={sub} highlight hero
            claimBy={claimByFor(sub.pickOfMonth)}
            overlap={overlapFor(sub.pickOfMonth)} onRemoveFromBuy={deleteBuyEntry}
          />
        </div>
      )}

      {/* Search across all synced drops — name, genre, platform, or month */}
      {sub.recs.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your PS Plus games…"
            className="w-full pl-8 pr-8 py-2 bg-white/[0.03] border border-white/10 text-white text-sm rounded-lg placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Controls + bulk actions */}
      {sub.available.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {(['all', 'monthly', 'catalog'] as BucketFilter[]).map(b => (
              <button key={b} onClick={() => setBucketFilter(b)}
                className={clsx('px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all',
                  bucketFilter === b ? 'bg-white/10 text-white/80' : 'text-white/35 hover:text-white/55')}>
                {b}
              </button>
            ))}
          </div>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/70 px-2 py-1.5 outline-none [color-scheme:dark]">
            <option value="match">Best match</option>
            <option value="metacritic">Metacritic</option>
            <option value="newest">Newest</option>
          </select>
          <div className="flex-1" />
          {sub.monthlyAvailable.length > 0 && (
            <button onClick={sub.claimAllMonthly}
              className="flex items-center gap-1 text-[10px] text-indigo-300/80 hover:text-indigo-200 bg-indigo-500/10 rounded-lg px-2.5 py-1.5 transition-colors">
              <ListPlus size={11} /> Claim all monthly
            </button>
          )}
        </div>
      )}

      {/* Available grid */}
      {gridGames.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gridGames.map(rec => (
            <SubscriptionGameCard
              key={rec.id} rec={rec} sub={sub}
              claimBy={claimByFor(rec)}
              overlap={overlapFor(rec)} onRemoveFromBuy={deleteBuyEntry}
            />
          ))}
        </div>
      )}

      {/* Saved */}
      {filteredSaved.length > 0 && (
        <Section title="Added & saved" count={filteredSaved.length}>
          <div className="flex flex-wrap gap-1.5">
            {filteredSaved.map(rec => (
              <span key={rec.id} className="text-[11px] text-white/45 bg-white/[0.04] rounded-lg px-2.5 py-1.5">
                {rec.gameName}
                <span className="text-white/20 ml-1">
                  {rec.status === 'played' ? '· Played' : rec.status === 'interested' ? '· Queue' : '· Library'}
                </span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {sub.available.length === 0 && sub.recs.length === 0 && !syncing && (
        <div className="text-center py-10">
          <Gift size={30} className="mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">No PS Plus games pulled yet</p>
          <p className="text-white/20 text-xs mt-1">Hit &quot;Find {monthLabel(sub.latestMonth)}&quot; or backfill recent months</p>
        </div>
      )}

      {/* No search results across any section */}
      {search && sub.recs.length > 0
        && gridGames.length === 0 && !pickOfMonthMatches
        && filteredSaved.length === 0 && filteredDismissed.length === 0 && (
        <div className="text-center py-8">
          <Search size={24} className="mx-auto mb-2 text-white/10" />
          <p className="text-white/30 text-sm">No PS Plus games match &ldquo;{searchQuery.trim()}&rdquo;</p>
          <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors">
            Clear search
          </button>
        </div>
      )}

      {/* Dismissed */}
      {filteredDismissed.length > 0 && (
        <div>
          <button onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors">
            {showDismissed ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Dismissed ({filteredDismissed.length})
          </button>
          {showDismissed && (
            <div className="mt-2 space-y-1.5">
              {filteredDismissed.map(rec => (
                <div key={rec.id} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-lg">
                  <span className="text-xs text-white/25 line-through">{rec.gameName}</span>
                  <button onClick={() => sub.undoDismiss(rec.id)}
                    className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors">
                    <Undo2 size={10} /> Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-xs font-medium text-white/60">{title}</h3>
        <span className="text-[10px] text-white/25">{count}</span>
      </div>
      {children}
    </div>
  );
}

// ── Individual game card ──────────────────────────────────────────────────────

function SubscriptionGameCard({
  rec, sub, highlight, hero, claimBy, overlap, onRemoveFromBuy,
}: {
  rec: GameRecommendation;
  sub: ReturnType<typeof useSubscriptionGames>;
  highlight?: boolean;
  hero?: boolean;
  claimBy?: string;
  overlap?: { buyId?: string; onList: boolean };
  onRemoveFromBuy?: (id: string) => Promise<void>;
}) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(7);

  return (
    <div className={clsx('bg-white/[0.03] border rounded-xl overflow-hidden transition-all',
      hero ? 'border-amber-500/25' : highlight ? 'border-orange-500/20' : 'border-white/5 hover:border-white/10')}>
      {/* Art */}
      <div className={clsx('relative bg-gradient-to-br from-indigo-900/30 to-blue-900/30', hero ? 'h-40' : 'h-28')}>
        {rec.thumbnail ? (
          <img src={rec.thumbnail} alt={rec.gameName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-3xl opacity-20">🎮</span></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Bucket badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-medium border backdrop-blur-sm bg-black/40 text-indigo-200 border-indigo-500/20">
          {rec.subscriptionBucket === 'monthly' ? 'Monthly Game' : 'Catalog'}
        </div>

        {/* Top pick / hype */}
        {rec.isTopPick && rec.hypeScore && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-orange-500/20">
            <Flame size={10} className="text-orange-400" />
            <span className="text-[10px] font-medium text-orange-300">{rec.hypeScore}/10</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className={clsx('text-white font-semibold leading-tight', hero ? 'text-base' : 'text-sm')}>{rec.gameName}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50 flex-wrap">
            {rec.genre && <span>{rec.genre}</span>}
            {rec.platform && <><span className="text-white/20">·</span><span>{rec.platform}</span></>}
            {rec.catalogMonth && <><span className="text-white/20">·</span><span>{monthLabel(rec.catalogMonth)}</span></>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* #1 overlap badge */}
        {overlap?.onList && (
          <div className="flex items-center justify-between gap-2 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-amber-200 font-medium">
              <ShoppingCart size={11} /> Free now — don&apos;t buy it
            </span>
            {overlap.buyId && onRemoveFromBuy && (
              <button onClick={() => onRemoveFromBuy(overlap.buyId!)}
                className="text-[10px] text-amber-300/80 hover:text-amber-200 transition-colors">Remove from Buy Queue</button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {rec.metacritic && (
            <span className={clsx('px-1.5 py-0.5 rounded font-medium',
              rec.metacritic >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
              rec.metacritic >= 50 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400')}>MC {rec.metacritic}</span>
          )}
          {rec.estimatedPrice ? (
            <span className="text-[11px] text-emerald-300/80">${rec.estimatedPrice.toFixed(0)} → Free</span>
          ) : (
            <span className="text-[11px] text-emerald-300/70">Free on PS Plus</span>
          )}
          {/* #7 claim-by */}
          {claimBy && (
            <span className="flex items-center gap-1 text-[11px] text-amber-300/80">
              <Clock size={10} /> Claim by {claimBy}
            </span>
          )}
        </div>

        <p className="text-xs text-white/65 italic leading-relaxed">&ldquo;{rec.aiReason}&rdquo;</p>

        {rec.sourceUrl && (
          <a href={rec.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-indigo-300 transition-colors">
            <ExternalLink size={9} /> {rec.sourceTitle || 'source'}
          </a>
        )}

        {showRating ? (
          <div className="space-y-2 bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
            <div className="text-[10px] text-white/40">Your rating</div>
            <div className="flex items-center gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => (
                <button key={i} onClick={() => setRating(i + 1)}
                  className={clsx('w-6 h-6 rounded text-xs font-medium transition-all',
                    i + 1 <= rating ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/20 border border-white/5')}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { sub.addAsPlayed(rec, { name: rec.gameName, rating }); setShowRating(false); }}
                className="flex-1 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors">
                Add as played
              </button>
              <button onClick={() => setShowRating(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white/60 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={() => sub.addAsPlaying(rec)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-colors"
              title="Add to library and start playing now">
              <Play size={12} /> Playing Now
            </button>
            <button onClick={() => sub.addToUpNext(rec)}
              className="flex items-center justify-center py-2 px-2.5 rounded-lg bg-indigo-500/10 text-indigo-300/80 text-xs hover:bg-indigo-500/20 transition-colors"
              title="Add to Up Next queue">
              <Bookmark size={12} />
            </button>
            <button onClick={() => setShowRating(true)}
              className="flex items-center justify-center py-2 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-400/70 text-xs hover:bg-emerald-500/20 transition-colors"
              title="Already played — add with a rating">
              <Check size={12} />
            </button>
            <button onClick={() => sub.markDismissed(rec.id)}
              className="flex items-center justify-center py-2 px-2.5 rounded-lg bg-white/5 text-white/25 text-xs hover:bg-red-500/10 hover:text-red-400/70 transition-colors"
              title="Not interested">
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
