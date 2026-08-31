'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Eye, Heart, Loader2,
  Radar, RefreshCw, Sparkles, Trash2, WandSparkles, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useRecommendations } from '../hooks/useRecommendations';
import { searchRAWGGame } from '../lib/rawg-api';
import { formatReleaseCountdown, formatReleaseDate, parseReleaseDate } from '../lib/release-date';
import { Game, GameRecommendation } from '../lib/types';

type RadarView = 'radar' | 'picks';

interface ReleaseRadarTabProps {
  games: Game[];
  userId: string | null;
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  onUpdateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onDeleteGame: (id: string) => Promise<void>;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
}

function releaseStatus(date?: string): Game['releaseDateStatus'] {
  const parsed = parseReleaseDate(date);
  if (!parsed) return 'tba';
  return parsed.getTime() < Date.now() ? 'released' : 'dated';
}

function checkedLabel(value?: string): string {
  if (!value) return 'Not checked yet';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Checked today';
  if (days === 1) return 'Checked yesterday';
  return `Checked ${days} days ago`;
}

function ReleaseArtwork({ name, thumbnail }: { name: string; thumbnail?: string }) {
  return (
    <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-gradient-to-br from-cyan-950 to-violet-950 sm:h-32 sm:w-28">
      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center"><Radar size={24} className="text-cyan-300/20" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111118]/35" />
      <span className="sr-only">Artwork for {name}</span>
    </div>
  );
}

interface SavedReleaseCardProps {
  name: string;
  thumbnail?: string;
  releaseDate?: string;
  checkedAt?: string;
  label: string;
  isChecking: boolean;
  onCheck: () => void;
  onRemove: () => void;
  onWishlist?: () => void;
}

function SavedReleaseCard(props: SavedReleaseCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  return (
    <article className="group flex min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition-colors hover:border-cyan-400/20">
      <ReleaseArtwork name={props.name} thumbnail={props.thumbnail} />
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">
              {props.label}
            </span>
          </div>
          <h3 className="truncate text-sm font-semibold text-white/90 sm:text-base">{props.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className={props.releaseDate ? 'text-white/55' : 'text-amber-300/70'}>{formatReleaseDate(props.releaseDate)}</span>
            <span className="text-white/15">•</span>
            <span className="font-medium text-cyan-300/75">{formatReleaseCountdown(props.releaseDate)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-[9px] text-white/25">{checkedLabel(props.checkedAt)}</span>
          <div className="flex shrink-0 items-center gap-1">
            {props.onWishlist && (
              <button onClick={props.onWishlist} className="flex min-h-9 items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 text-[10px] font-medium text-violet-300/80 hover:bg-violet-500/20">
                <Heart size={12} /> Wishlist
              </button>
            )}
            <button onClick={props.onCheck} disabled={props.isChecking} title="Check release date" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-white/35 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-40">
              <RefreshCw size={13} className={props.isChecking ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => confirmingRemove ? props.onRemove() : setConfirmingRemove(true)}
              aria-label={confirmingRemove ? `Confirm removing ${props.name}` : `Remove ${props.name} from radar`}
              className={clsx(
                'flex h-9 items-center justify-center rounded-lg transition-colors',
                confirmingRemove ? 'gap-1 bg-red-500/15 px-2.5 text-[10px] font-medium text-red-300' : 'w-9 bg-white/[0.04] text-white/25 hover:bg-red-500/10 hover:text-red-300'
              )}
            >
              <Trash2 size={13} /> {confirmingRemove && 'Remove?'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function AiPickCard({ recommendation, onWatch, onWishlist, onDismiss }: {
  recommendation: GameRecommendation;
  onWatch: () => void;
  onWishlist: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-violet-400/10 bg-white/[0.025]">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-violet-950 to-cyan-950 sm:h-44">
        {recommendation.thumbnail && <img src={recommendation.thumbnail} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/25 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-violet-300/15 bg-black/55 px-2 py-1 backdrop-blur-md">
          <WandSparkles size={10} className="text-violet-300" />
          <span className="text-[9px] font-semibold text-violet-200">AI match {recommendation.hypeScore ?? 5}/10</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-semibold leading-tight text-white">{recommendation.gameName}</h3>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/55">
            <span>{formatReleaseDate(recommendation.releaseDate)}</span>
            <span>•</span>
            <span className="font-medium text-cyan-200">{formatReleaseCountdown(recommendation.releaseDate)}</span>
          </div>
        </div>
      </div>
      <div className="p-3.5">
        <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-violet-300/45"><Sparkles size={9} /> Why it made the cut</div>
        <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-white/55">{recommendation.aiReason}</p>
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <button onClick={onWatch} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-cyan-500/10 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"><Eye size={13} /> Watch</button>
          <button onClick={onWishlist} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-500/10 text-xs font-medium text-violet-300 hover:bg-violet-500/20"><Heart size={13} /> Wishlist</button>
          <button onClick={onDismiss} aria-label={`Dismiss ${recommendation.gameName}`} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/30 hover:bg-red-500/10 hover:text-red-300"><X size={14} /></button>
        </div>
      </div>
    </article>
  );
}

export function ReleaseRadarTab({ games, userId, onAddGame, onUpdateGame, onDeleteGame, onNotify }: ReleaseRadarTabProps) {
  const {
    upcomingPicks, watching, loading, generatingUpcoming, error,
    generateUpcoming, markWatching, markDismissed, markWishlisted, checkReleaseDate,
  } = useRecommendations(userId, games);
  const [view, setView] = useState<RadarView>('radar');
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const wishlist = useMemo(() => games.filter(game => game.status === 'Wishlist'), [games]);
  const wishlistNames = useMemo(() => new Set(wishlist.map(game => game.name.toLowerCase())), [wishlist]);
  const watchedReleases = useMemo(
    () => Array.from(new Map(
      watching
        .filter(rec => rec.isUpcoming && !wishlistNames.has(rec.gameName.toLowerCase()))
        .map(rec => [rec.rawgId ? `rawg:${rec.rawgId}` : `name:${rec.gameName.toLowerCase()}`, rec])
    ).values()),
    [watching, wishlistNames]
  );
  const missingWishlistDates = wishlist.filter(game => !game.releaseDate && !game.releaseDateCheckedAt);
  const datedCount = wishlist.filter(game => !!game.releaseDate).length + watchedReleases.filter(rec => !!rec.releaseDate).length;
  const trackedCount = wishlist.length + watchedReleases.length;

  const withChecking = async (id: string, action: () => Promise<unknown>) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try { await action(); }
    catch (e) { onNotify?.(`Could not check that release: ${(e as Error).message}`, 'error'); }
    finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const checkWishlistGame = async (game: Game, quiet = false) => {
    const rawg = await searchRAWGGame(game.name, true);
    await onUpdateGame(game.id, {
      rawgId: rawg?.id ?? game.rawgId,
      releaseDate: rawg?.released || game.releaseDate,
      releaseDateStatus: releaseStatus(rawg?.released || game.releaseDate),
      releaseDateCheckedAt: new Date().toISOString(),
      releaseDateSource: 'rawg',
      thumbnail: rawg?.backgroundImage || game.thumbnail,
    });
    if (!quiet) onNotify?.(rawg?.released ? `${game.name} is up to date` : `${game.name} is still TBA`, 'success');
  };

  const syncWishlist = async () => {
    if (missingWishlistDates.length === 0) return;
    setSyncing(true);
    try {
      for (const game of missingWishlistDates) await checkWishlistGame(game, true);
      onNotify?.(`Checked ${missingWishlistDates.length} wishlist release${missingWishlistDates.length === 1 ? '' : 's'}`, 'success');
    } catch (e) {
      onNotify?.(`Could not finish checking dates: ${(e as Error).message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const checkAll = async () => {
    if (trackedCount === 0) return;
    setSyncing(true);
    try {
      for (const game of wishlist) await checkWishlistGame(game, true);
      for (const rec of watchedReleases) await checkReleaseDate(rec.id);
      onNotify?.('Release dates are up to date', 'success');
    } catch (e) {
      onNotify?.(`Some dates could not be checked: ${(e as Error).message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const addRecommendationToWishlist = async (rec: GameRecommendation) => {
    if (wishlistNames.has(rec.gameName.toLowerCase())) {
      await markWishlisted(rec.id);
      return;
    }
    await onAddGame({
      name: rec.gameName,
      price: 0,
      hours: 0,
      rating: 0,
      status: 'Wishlist',
      genre: rec.genre,
      platform: rec.platform,
      thumbnail: rec.thumbnail,
      rawgId: rec.rawgId,
      releaseDate: rec.releaseDate,
      releaseDateStatus: releaseStatus(rec.releaseDate),
      releaseDateCheckedAt: rec.releaseDateCheckedAt || new Date().toISOString(),
      releaseDateSource: rec.releaseDateSource === 'sample' ? 'sample' : 'rawg',
    });
    await markWishlisted(rec.id);
    onNotify?.(`${rec.gameName} added to Wishlist`, 'success');
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.09] via-white/[0.025] to-violet-500/[0.08] p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60"><Radar size={13} /> Release Radar</div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Your next games, before they land.</h2>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/40 sm:text-sm">AI curates the signal from your taste. You decide what earns a place.</p>
          </div>
          <button onClick={checkAll} disabled={syncing || trackedCount === 0} aria-label="Check all release dates" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-black/15 px-3 text-[11px] font-medium text-white/50 hover:text-white/80 disabled:opacity-30">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Check dates</span>
          </button>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { value: trackedCount, label: 'Tracked' },
            { value: datedCount, label: 'Dated' },
            { value: upcomingPicks.length, label: 'AI picks' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5">
              <div className="text-lg font-semibold text-white/85">{stat.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-white/30">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {missingWishlistDates.length > 0 && (
        <button onClick={syncWishlist} disabled={syncing} className="group flex w-full items-center gap-3 rounded-2xl border border-amber-400/10 bg-amber-400/[0.045] p-3.5 text-left hover:border-amber-400/20">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><CalendarDays size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white/80">Complete your release radar</div>
            <div className="mt-0.5 text-[10px] text-white/35">Check {missingWishlistDates.length} wishlist game{missingWishlistDates.length === 1 ? '' : 's'} for saved release dates</div>
          </div>
          {syncing ? <Loader2 size={15} className="shrink-0 animate-spin text-amber-300" /> : <ChevronRight size={15} className="shrink-0 text-white/20 group-hover:text-amber-300" />}
        </button>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.025] p-1">
        {([
          { id: 'radar', label: 'My Radar', icon: Eye, count: trackedCount },
          { id: 'picks', label: 'AI Picks', icon: Sparkles, count: upcomingPicks.length },
        ] as const).map(item => (
          <button key={item.id} onClick={() => setView(item.id)} aria-pressed={view === item.id} className={clsx('flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all', view === item.id ? 'border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-200' : 'text-white/35 hover:text-white/60')}>
            <item.icon size={13} /> {item.label} <span className="text-[9px] opacity-50">{item.count}</span>
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300/80">{error.message}</div>}

      {view === 'radar' && (
        trackedCount > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {wishlist.map(game => (
              <SavedReleaseCard key={game.id} name={game.name} thumbnail={game.thumbnail} releaseDate={game.releaseDate} checkedAt={game.releaseDateCheckedAt} label="Wishlist" isChecking={checkingIds.has(game.id)} onCheck={() => withChecking(game.id, () => checkWishlistGame(game))} onRemove={async () => { await onDeleteGame(game.id); onNotify?.(`${game.name} removed from Wishlist`, 'success'); }} />
            ))}
            {watchedReleases.map(rec => (
              <SavedReleaseCard key={rec.id} name={rec.gameName} thumbnail={rec.thumbnail} releaseDate={rec.releaseDate} checkedAt={rec.releaseDateCheckedAt} label="Watching" isChecking={checkingIds.has(rec.id)} onCheck={() => withChecking(rec.id, () => checkReleaseDate(rec.id))} onWishlist={() => addRecommendationToWishlist(rec)} onRemove={() => markDismissed(rec.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center">
            <Eye size={28} className="mx-auto text-white/10" />
            <p className="mt-3 text-sm font-medium text-white/45">Nothing on your radar yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-white/25">Open AI Picks and watch the releases you want to keep close.</p>
            <button onClick={() => setView('picks')} className="mt-4 rounded-xl bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300">See AI Picks</button>
          </div>
        )
      )}

      {view === 'picks' && (
        <div className="space-y-4">
          <button onClick={generateUpcoming} disabled={generatingUpcoming || games.length === 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-sm font-medium text-violet-200 hover:from-violet-500/15 hover:to-cyan-500/15 disabled:opacity-35">
            {generatingUpcoming ? <><Loader2 size={15} className="animate-spin" /> AI is scanning upcoming releases…</> : <><WandSparkles size={15} /> {upcomingPicks.length ? 'Refresh AI picks' : 'Find releases for me'}</>}
          </button>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/20" /></div>
          ) : upcomingPicks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[...upcomingPicks].sort((a, b) => (b.hypeScore ?? 0) - (a.hypeScore ?? 0)).map(rec => (
                <AiPickCard key={rec.id} recommendation={rec} onWatch={() => markWatching(rec.id)} onWishlist={() => addRecommendationToWishlist(rec)} onDismiss={() => markDismissed(rec.id)} />
              ))}
            </div>
          ) : !generatingUpcoming && (
            <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center">
              <Sparkles size={28} className="mx-auto text-violet-300/15" />
              <p className="mt-3 text-sm font-medium text-white/45">Your signal is ready</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-white/25">AI will use your library, play history, genres, and platforms to choose the strongest upcoming matches.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pt-1 text-[9px] text-white/20"><Check size={10} /> Dates come from RAWG. AI ranks relevance, never invents release facts.</div>
    </div>
  );
}
