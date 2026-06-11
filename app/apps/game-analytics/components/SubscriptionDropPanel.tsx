'use client';

import { useState } from 'react';
import {
  Gift, Loader2, Sparkles, Flame, Check, Heart, X, ListPlus, Bookmark,
  ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Undo2, PiggyBank,
} from 'lucide-react';
import { Game, GameRecommendation, SubscriptionTier } from '../lib/types';
import { useSubscriptionGames } from '../hooks/useSubscriptionGames';
import { monthLabel } from '../lib/subscription-settings';
import clsx from 'clsx';

interface SubscriptionDropPanelProps {
  games: Game[];
  userId: string | null;
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  onAddToQueue: (gameId: string) => Promise<void>;
}

const TIERS: { id: SubscriptionTier; label: string; blurb: string }[] = [
  { id: 'Essential', label: 'Essential', blurb: 'Monthly games' },
  { id: 'Extra', label: 'Extra', blurb: 'Monthly + Game Catalog' },
  { id: 'Premium', label: 'Premium', blurb: 'Everything + Classics' },
];

// How far back a backfill can reach (in months). Larger spans mean more
// grounded AI searches (one per month), so they take longer.
const BACKFILL_OPTIONS = [3, 6, 12, 24, 36, 60];

function backfillLabel(months: number): string {
  if (months < 12) return `last ${months} mo`;
  const years = months / 12;
  return `last ${years} ${years === 1 ? 'yr' : 'yrs'}`;
}

export function SubscriptionDropPanel({ games, userId, onAddGame, onAddToQueue }: SubscriptionDropPanelProps) {
  const sub = useSubscriptionGames({ userId, games, onAddGame, onAddToQueue });
  const [backfillMonths, setBackfillMonths] = useState(6);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Headline citation: latest sync result, else the most recent saved rec's source.
  const citation = sub.lastResult?.primarySource
    || (sub.recs.find(r => r.sourceUrl) ? { uri: sub.recs.find(r => r.sourceUrl)!.sourceUrl!, title: sub.recs.find(r => r.sourceTitle)?.sourceTitle || 'source' } : null);

  const syncing = sub.progress.active;

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

      {/* Config + savings header */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-indigo-300" />
            <span className="text-sm font-semibold text-white">PS Plus Free Games</span>
          </div>
          <button
            onClick={() => sub.setEnabled(false)}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
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

        {/* Claimed value */}
        {sub.claimedValue.count > 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-300/80 bg-emerald-500/[0.06] rounded-lg px-3 py-2">
            <PiggyBank size={14} className="text-emerald-400" />
            <span>
              You&apos;ve claimed <strong className="text-emerald-200">{sub.claimedValue.count}</strong> PS Plus
              {sub.claimedValue.count === 1 ? ' game' : ' games'} worth about{' '}
              <strong className="text-emerald-200">${Math.round(sub.claimedValue.value)}</strong>.
            </span>
          </div>
        )}

        {/* Sync controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sub.syncLatest}
            disabled={syncing}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
              syncing
                ? 'bg-white/5 text-white/25 cursor-not-allowed'
                : 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 border border-indigo-500/15'
            )}
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
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                syncing
                  ? 'bg-white/5 text-white/25 cursor-not-allowed'
                  : 'bg-white/[0.04] text-white/55 hover:text-white/80 border border-white/5'
              )}
            >
              {syncing && sub.progress.total > 1 ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
              Backfill
            </button>
          </div>
        </div>

        {/* Heads-up for long backfills */}
        {!syncing && backfillMonths >= 24 && (
          <p className="text-[10px] text-white/30">
            Backfilling {backfillLabel(backfillMonths).replace('last ', '')} runs {backfillMonths} searches — it&apos;ll take a few minutes.
          </p>
        )}

        {/* Progress */}
        {syncing && (
          <div className="text-[11px] text-white/40">
            Searching {monthLabel(sub.progress.current)}
            {sub.progress.total > 1 && ` (${sub.progress.done + 1}/${sub.progress.total})`}…
          </div>
        )}

        {/* Source citation */}
        {citation && (
          <a
            href={citation.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink size={10} />
            Powered by: {citation.title}
          </a>
        )}

        {/* No-result note */}
        {sub.lastResult && sub.lastResult.games.length === 0 && !syncing && (
          <p className="text-[11px] text-white/35">
            Couldn&apos;t confirm the {monthLabel(sub.lastResult.month)} lineup from a reliable source. Try again, or add games manually.
          </p>
        )}
      </div>

      {/* Top picks */}
      {sub.topPicks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame size={13} className="text-orange-400" />
              <h3 className="text-xs font-medium text-white/60">Picked for you</h3>
              <span className="text-[10px] text-white/25">{sub.topPicks.length}</span>
            </div>
            <button
              onClick={sub.addAllTopPicksToUpNext}
              className="flex items-center gap-1 text-[10px] text-indigo-300/70 hover:text-indigo-300 transition-colors"
            >
              <ListPlus size={11} /> Add all to Up Next
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sub.topPicks.map(rec => (
              <SubscriptionGameCard key={rec.id} rec={rec} sub={sub} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Monthly games */}
      {sub.monthlyAvailable.filter(r => !r.isTopPick).length > 0 && (
        <Section title="Monthly Games" count={sub.monthlyAvailable.filter(r => !r.isTopPick).length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sub.monthlyAvailable.filter(r => !r.isTopPick).map(rec => (
              <SubscriptionGameCard key={rec.id} rec={rec} sub={sub} />
            ))}
          </div>
        </Section>
      )}

      {/* Catalog additions (collapsible — can be large) */}
      {sub.catalogAvailable.filter(r => !r.isTopPick).length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white/80 transition-colors"
          >
            {showCatalog ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Catalog Additions
            <span className="text-[10px] text-white/25">{sub.catalogAvailable.filter(r => !r.isTopPick).length}</span>
          </button>
          {showCatalog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sub.catalogAvailable.filter(r => !r.isTopPick).map(rec => (
                <SubscriptionGameCard key={rec.id} rec={rec} sub={sub} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved */}
      {sub.saved.length > 0 && (
        <Section title="Added & saved" count={sub.saved.length}>
          <div className="flex flex-wrap gap-1.5">
            {sub.saved.map(rec => (
              <span key={rec.id} className="text-[11px] text-white/45 bg-white/[0.04] rounded-lg px-2.5 py-1.5">
                {rec.gameName}
                <span className="text-white/20 ml-1">
                  {rec.status === 'interested' ? '· Up Next' : rec.status === 'wishlisted' ? '· Wishlist' : '· Someday'}
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

      {/* Dismissed */}
      {sub.dismissed.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            {showDismissed ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Dismissed ({sub.dismissed.length})
          </button>
          {showDismissed && (
            <div className="mt-2 space-y-1.5">
              {sub.dismissed.map(rec => (
                <div key={rec.id} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-lg">
                  <span className="text-xs text-white/25 line-through">{rec.gameName}</span>
                  <button
                    onClick={() => sub.undoDismiss(rec.id)}
                    className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors"
                  >
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
  rec,
  sub,
  highlight,
}: {
  rec: GameRecommendation;
  sub: ReturnType<typeof useSubscriptionGames>;
  highlight?: boolean;
}) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(7);

  return (
    <div className={clsx(
      'bg-white/[0.03] border rounded-xl overflow-hidden transition-all',
      highlight ? 'border-orange-500/20' : 'border-white/5 hover:border-white/10'
    )}>
      {/* Art */}
      <div className="relative h-28 bg-gradient-to-br from-indigo-900/30 to-blue-900/30">
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
          <h3 className="text-white font-semibold text-sm leading-tight">{rec.gameName}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50">
            {rec.genre && <span>{rec.genre}</span>}
            {rec.platform && <><span className="text-white/20">·</span><span>{rec.platform}</span></>}
            {rec.catalogMonth && <><span className="text-white/20">·</span><span>{monthLabel(rec.catalogMonth)}</span></>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-3 text-xs">
          {rec.metacritic && (
            <span className={clsx(
              'px-1.5 py-0.5 rounded font-medium',
              rec.metacritic >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
              rec.metacritic >= 50 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'
            )}>MC {rec.metacritic}</span>
          )}
          {rec.estimatedPrice ? (
            <span className="text-[11px] text-emerald-300/80">${rec.estimatedPrice.toFixed(0)} → Free</span>
          ) : (
            <span className="text-[11px] text-emerald-300/70">Free on PS Plus</span>
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
            <button onClick={() => sub.addToUpNext(rec)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-500/10 text-indigo-300/80 text-xs font-medium hover:bg-indigo-500/20 transition-colors"
              title="Add to library and Up Next queue">
              <ListPlus size={12} /> Up Next
            </button>
            <button onClick={() => sub.saveForLater(rec.id)}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-cyan-500/10 text-cyan-300/70 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
              title="Save for later — keep it here as a maybe, don't add to library">
              <Bookmark size={12} />
            </button>
            <button onClick={() => sub.addToWishlist(rec)}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-purple-500/10 text-purple-400/70 text-xs font-medium hover:bg-purple-500/20 transition-colors"
              title="Add to your library Wishlist">
              <Heart size={12} />
            </button>
            <button onClick={() => setShowRating(true)}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-400/70 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              title="Already played — add with a rating">
              <Check size={12} />
            </button>
            <button onClick={() => sub.markDismissed(rec.id)}
              className="py-2 px-2.5 rounded-lg bg-white/5 text-white/25 text-xs hover:bg-red-500/10 hover:text-red-400/70 transition-colors"
              title="Not interested">
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
