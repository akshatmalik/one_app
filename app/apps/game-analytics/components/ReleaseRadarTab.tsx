'use client';

import { useMemo, useRef, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Clock3, Eye, Flame, Heart, Loader2,
  MessageSquareText, Radar, RefreshCw, Rocket, Sparkles, Star, Trash2,
  WandSparkles, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useRecommendations } from '../hooks/useRecommendations';
import { searchRAWGGame } from '../lib/rawg-api';
import { formatReleaseCountdown, formatReleaseDate, getReleaseCountdown, parseReleaseDate } from '../lib/release-date';
import { Game, GameRecommendation, ReleaseExcitement } from '../lib/types';
import { ShareButton } from './ShareButton';

type RadarView = 'radar' | 'picks';
type RadarFilter = 'all' | ReleaseExcitement | 'released';

interface ReleaseRadarTabProps {
  games: Game[];
  userId: string | null;
  onAddGame: (data: Omit<Game, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  onUpdateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onDeleteGame: (id: string) => Promise<void>;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
}

interface RadarEntry {
  key: string;
  source: 'wishlist' | 'recommendation';
  id: string;
  name: string;
  thumbnail?: string;
  releaseDate?: string;
  checkedAt?: string;
  excitement: ReleaseExcitement;
  note?: string;
  metacritic?: number;
  rawgRating?: number;
}

const EXCITEMENT: Array<{ id: ReleaseExcitement; label: string; icon: typeof Eye; active: string }> = [
  { id: 'interested', label: 'Interested', icon: Eye, active: 'border-sky-400/30 bg-sky-400/15 text-sky-200' },
  { id: 'excited', label: 'Excited', icon: Flame, active: 'border-orange-400/30 bg-orange-400/15 text-orange-200' },
  { id: 'must-play', label: 'Must Play', icon: Rocket, active: 'border-fuchsia-400/30 bg-fuchsia-400/15 text-fuchsia-200' },
];

function releaseStatus(date?: string): Game['releaseDateStatus'] {
  const parsed = parseReleaseDate(date);
  if (!parsed) return 'tba';
  return parsed.getTime() < new Date().setHours(0, 0, 0, 0) ? 'released' : 'dated';
}

function isReleased(date?: string): boolean {
  const parsed = parseReleaseDate(date);
  return !!parsed && parsed.getTime() < new Date().setHours(0, 0, 0, 0);
}

function checkedLabel(value?: string): string {
  if (!value) return 'Not checked yet';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Checked today';
  if (days === 1) return 'Checked yesterday';
  return `Checked ${days} days ago`;
}

function sortByRelease(a: RadarEntry, b: RadarEntry): number {
  const aTime = parseReleaseDate(a.releaseDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = parseReleaseDate(b.releaseDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime || a.name.localeCompare(b.name);
}

function releaseGroup(entry: RadarEntry): string {
  const days = getReleaseCountdown(entry.releaseDate);
  if (isReleased(entry.releaseDate)) return 'Available now';
  if (days === null) return 'Date not confirmed';
  if (days <= 7) return 'Launching this week';
  if (days <= 31) return 'Later this month';
  if (days <= 92) return 'Next three months';
  return 'Further out';
}

function ExcitementPicker({ value, onChange, compact = false }: {
  value: ReleaseExcitement;
  onChange: (value: ReleaseExcitement) => void;
  compact?: boolean;
}) {
  return (
    <div className={clsx('grid grid-cols-3', compact ? 'gap-1' : 'gap-2')}>
      {EXCITEMENT.map(option => {
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={clsx(
              'flex items-center justify-center rounded-lg border font-medium transition-colors',
              compact ? 'min-h-8 gap-1 px-1 text-[9px]' : 'min-h-10 gap-1.5 px-2 text-[11px]',
              value === option.id ? option.active : 'border-white/[0.06] bg-white/[0.025] text-white/30 hover:text-white/60'
            )}
          >
            <Icon size={compact ? 10 : 12} /> {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ScoreSignal({ metacritic, rawgRating }: { metacritic?: number; rawgRating?: number }) {
  if (!metacritic && !rawgRating) return <span className="text-white/25">Reviews pending</span>;
  return (
    <span className="flex items-center gap-2">
      {metacritic && <span className="font-semibold text-emerald-300/80">MC {metacritic}</span>}
      {rawgRating && <span className="flex items-center gap-0.5 text-amber-200/70"><Star size={10} /> {rawgRating.toFixed(1)}</span>}
    </span>
  );
}

function ReleaseArtwork({ name, thumbnail }: { name: string; thumbnail?: string }) {
  return (
    <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-gradient-to-br from-cyan-950 to-violet-950 sm:h-36 sm:w-28">
      {thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Radar size={24} className="text-cyan-300/20" /></div>}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111118]/40" />
      <span className="sr-only">Artwork for {name}</span>
    </div>
  );
}

function SavedReleaseCard({ entry, isChecking, onCheck, onRemove, onWishlist, onExcitement, onOpen }: {
  entry: RadarEntry;
  isChecking: boolean;
  onCheck: () => void;
  onRemove: () => void;
  onWishlist?: () => void;
  onExcitement: (value: ReleaseExcitement) => void;
  onOpen: () => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  return (
    <article className="group flex min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition-colors hover:border-cyan-400/20">
      <button onClick={onOpen} className="shrink-0 text-left"><ReleaseArtwork name={entry.name} thumbnail={entry.thumbnail} /></button>
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <button onClick={onOpen} className="min-w-0 text-left">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">{entry.source === 'wishlist' ? 'Wishlist' : 'Watching'}</span>
            <span className="text-[10px]"><ScoreSignal metacritic={entry.metacritic} rawgRating={entry.rawgRating} /></span>
          </div>
          <h3 className="truncate text-sm font-semibold text-white/90 sm:text-base">{entry.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
            <span className={entry.releaseDate ? 'text-white/55' : 'text-amber-300/70'}>{formatReleaseDate(entry.releaseDate)}</span><span className="text-white/15">•</span>
            <span className="font-semibold text-cyan-300/80">{isReleased(entry.releaseDate) ? 'Released' : formatReleaseCountdown(entry.releaseDate)}</span>
          </div>
        </button>
        <div className="mt-2">
          <ExcitementPicker value={entry.excitement} onChange={onExcitement} compact />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[9px] text-white/25">{entry.note ? `“${entry.note}”` : checkedLabel(entry.checkedAt)}</span>
            <div className="flex shrink-0 items-center gap-1">
              {onWishlist && <button onClick={onWishlist} title="Add to Wishlist" className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300/80 hover:bg-violet-500/20"><Heart size={12} /></button>}
              <button onClick={onCheck} disabled={isChecking} title="Check release date and reviews" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-white/35 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-40"><RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} /></button>
              <button onClick={() => confirmingRemove ? onRemove() : setConfirmingRemove(true)} aria-label={confirmingRemove ? `Confirm removing ${entry.name}` : `Remove ${entry.name} from radar`} className={clsx('flex h-8 items-center justify-center rounded-lg', confirmingRemove ? 'gap-1 bg-red-500/15 px-2 text-[9px] text-red-300' : 'w-8 bg-white/[0.04] text-white/25 hover:text-red-300')}><Trash2 size={12} /> {confirmingRemove && 'Remove?'}</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function AiPickCard({ recommendation, onExcitement, onWishlist, onDismiss }: {
  recommendation: GameRecommendation;
  onExcitement: (value: ReleaseExcitement) => void;
  onWishlist: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-violet-400/10 bg-white/[0.025]">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-violet-950 to-cyan-950 sm:h-44">
        {recommendation.thumbnail && <img src={recommendation.thumbnail} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/25 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-violet-300/15 bg-black/55 px-2 py-1 backdrop-blur-md"><WandSparkles size={10} className="text-violet-300" /><span className="text-[9px] font-semibold text-violet-200">Taste match {recommendation.hypeScore ?? 5}/10</span></div>
        <div className="absolute bottom-3 left-3 right-3"><h3 className="text-base font-semibold leading-tight text-white">{recommendation.gameName}</h3><div className="mt-1 flex items-center gap-2 text-[10px] text-white/55"><span>{formatReleaseDate(recommendation.releaseDate)}</span><span>•</span><span className="font-medium text-cyan-200">{formatReleaseCountdown(recommendation.releaseDate)}</span></div></div>
      </div>
      <div className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px]"><span className="flex items-center gap-1 uppercase tracking-[0.14em] text-violet-300/45"><Sparkles size={9} /> Why it made the cut</span><ScoreSignal metacritic={recommendation.metacritic} rawgRating={recommendation.rawgRating} /></div>
        <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-white/55">{recommendation.aiReason}</p>
        <div className="mt-3"><ExcitementPicker value={recommendation.releaseExcitement ?? 'interested'} onChange={onExcitement} compact /></div>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5"><button onClick={onWishlist} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-500/10 text-xs font-medium text-violet-300 hover:bg-violet-500/20"><Heart size={12} /> Wishlist</button><button onClick={onDismiss} aria-label={`Dismiss ${recommendation.gameName}`} className="flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/30 hover:bg-red-500/10 hover:text-red-300"><X size={13} /></button></div>
      </div>
    </article>
  );
}

function ReleaseDetails({ entry, onClose, onExcitement, onSaveNote, onStartPlaying }: {
  entry: RadarEntry;
  onClose: () => void;
  onExcitement: (value: ReleaseExcitement) => void;
  onSaveNote: (note: string) => void;
  onStartPlaying?: () => void;
}) {
  const [note, setNote] = useState(entry.note ?? '');
  const shareRef = useRef<HTMLDivElement>(null);
  const released = isReleased(entry.releaseDate);
  const countdown = getReleaseCountdown(entry.releaseDate);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111118] shadow-2xl sm:rounded-3xl" onClick={event => event.stopPropagation()}>
        <div ref={shareRef} className="overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-950 via-[#151522] to-violet-950">
          <div className="relative h-52 overflow-hidden">
            {entry.thumbnail && <img src={entry.thumbnail} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-black/30 to-transparent" />
            <button data-share-hide="true" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur"><X size={16} /></button>
            <div className="absolute bottom-4 left-5 right-5"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">On my release radar</div><h2 className="text-2xl font-bold text-white">{entry.name}</h2><div className="mt-1 text-sm text-white/55">{formatReleaseDate(entry.releaseDate)}</div></div>
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-5 pb-5">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] p-3"><div className="text-2xl font-bold text-cyan-200">{released ? 'OUT' : countdown ?? 'TBA'}</div><div className="text-[9px] uppercase tracking-wider text-cyan-200/45">{released ? 'available now' : countdown === null ? 'date pending' : countdown === 1 ? 'day to go' : 'days to go'}</div></div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"><div className="text-lg font-bold text-white/85">{entry.metacritic ?? '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/30">Metacritic</div></div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"><div className="text-lg font-bold text-white/85">{entry.rawgRating?.toFixed(1) ?? '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/30">Community</div></div>
          </div>
          {entry.note && <p className="px-5 pb-5 text-sm italic leading-relaxed text-white/55">“{entry.note}”</p>}
          <div className="pb-4 text-center text-[9px] uppercase tracking-[0.2em] text-white/20">Game Analytics · Release Radar</div>
        </div>
        <div className="space-y-4 p-5">
          <div><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">How excited are you?</div><ExcitementPicker value={entry.excitement} onChange={onExcitement} /></div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-white/70"><MessageSquareText size={14} className="text-emerald-300" /> Review signal</div><div className="mt-3 flex items-center gap-4 text-sm"><ScoreSignal metacritic={entry.metacritic} rawgRating={entry.rawgRating} /></div><p className="mt-2 text-xs leading-relaxed text-white/35">{released ? entry.metacritic || entry.rawgRating ? 'Scores are available. Recheck to pull the latest consensus before you buy.' : 'No aggregate reviews are available from RAWG yet.' : 'Critic reviews usually arrive near launch. Recheck this game as the date gets closer.'}</p></div>
          <label className="block"><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Why I’m watching</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={240} placeholder="Waiting for performance reviews, loved the first game…" className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-sm text-white/75 outline-none placeholder:text-white/20 focus:border-cyan-400/30" /></label>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button onClick={() => { setNote('Waiting for reviews before buying.'); onSaveNote('Waiting for reviews before buying.'); }} className="rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-white/50 hover:text-white/75">Wait for reviews</button>{released && onStartPlaying && <button onClick={onStartPlaying} className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">Start playing</button>}</div><button onClick={() => onSaveNote(note.trim())} className="rounded-xl bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200">Save note</button></div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="text-xs text-white/30">Share your countdown</span><ShareButton targetRef={shareRef} filename={`release-radar-${entry.name.replace(/\s+/g, '-').toLowerCase()}`} shareText={`${entry.name} is ${formatReleaseCountdown(entry.releaseDate)} away — it’s on my Release Radar.`} /></div>
        </div>
      </div>
    </div>
  );
}

export function ReleaseRadarTab({ games, userId, onAddGame, onUpdateGame, onDeleteGame, onNotify }: ReleaseRadarTabProps) {
  const { upcomingPicks, watching, loading, generatingUpcoming, error, generateUpcoming, markDismissed, markWishlisted, updateRecommendation, checkReleaseDate } = useRecommendations(userId, games);
  const [view, setView] = useState<RadarView>('radar');
  const [filter, setFilter] = useState<RadarFilter>('all');
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const wishlist = useMemo(() => games.filter(game => game.status === 'Wishlist'), [games]);
  const wishlistNames = useMemo(() => new Set(wishlist.map(game => game.name.toLowerCase())), [wishlist]);
  const watchedReleases = useMemo(() => Array.from(new Map(watching.filter(rec => rec.isUpcoming && !wishlistNames.has(rec.gameName.toLowerCase())).map(rec => [rec.rawgId ? `rawg:${rec.rawgId}` : `name:${rec.gameName.toLowerCase()}`, rec])).values()), [watching, wishlistNames]);
  const entries = useMemo<RadarEntry[]>(() => [
    ...wishlist.map(game => ({ key: `game:${game.id}`, source: 'wishlist' as const, id: game.id, name: game.name, thumbnail: game.thumbnail, releaseDate: game.releaseDate, checkedAt: game.releaseDateCheckedAt, excitement: game.releaseExcitement ?? 'interested', note: game.anticipationNote, metacritic: game.metacriticScore, rawgRating: game.rawgRating })),
    ...watchedReleases.map(rec => ({ key: `rec:${rec.id}`, source: 'recommendation' as const, id: rec.id, name: rec.gameName, thumbnail: rec.thumbnail, releaseDate: rec.releaseDate, checkedAt: rec.releaseDateCheckedAt, excitement: rec.releaseExcitement ?? 'interested', note: rec.anticipationNote, metacritic: rec.metacritic, rawgRating: rec.rawgRating })),
  ].sort(sortByRelease), [wishlist, watchedReleases]);
  const selectedEntry = entries.find(entry => entry.key === selectedKey) ?? null;
  const filteredEntries = entries.filter(entry => filter === 'all' || (filter === 'released' ? isReleased(entry.releaseDate) : entry.excitement === filter));
  const groupedEntries = useMemo(() => { const groups = new Map<string, RadarEntry[]>(); for (const entry of filteredEntries) { const group = releaseGroup(entry); groups.set(group, [...(groups.get(group) ?? []), entry]); } return groups; }, [filteredEntries]);
  const featured = entries.find(entry => !isReleased(entry.releaseDate) && !!entry.releaseDate) ?? entries[0];
  const missingWishlistDates = wishlist.filter(game => !game.releaseDate && !game.releaseDateCheckedAt);
  const datedCount = entries.filter(entry => !!entry.releaseDate).length;
  const mustPlayCount = entries.filter(entry => entry.excitement === 'must-play').length;

  const withChecking = async (id: string, action: () => Promise<unknown>) => { setCheckingIds(prev => new Set(prev).add(id)); try { await action(); } catch (e) { onNotify?.(`Could not check that release: ${(e as Error).message}`, 'error'); } finally { setCheckingIds(prev => { const next = new Set(prev); next.delete(id); return next; }); } };
  const checkWishlistGame = async (game: Game, quiet = false) => { const rawg = await searchRAWGGame(game.name, true); await onUpdateGame(game.id, { rawgId: rawg?.id ?? game.rawgId, releaseDate: rawg?.released || game.releaseDate, releaseDateStatus: releaseStatus(rawg?.released || game.releaseDate), releaseDateCheckedAt: new Date().toISOString(), releaseDateSource: 'rawg', thumbnail: rawg?.backgroundImage || game.thumbnail, metacriticScore: rawg?.metacritic || game.metacriticScore, rawgRating: rawg?.rating || game.rawgRating }); if (!quiet) onNotify?.(rawg?.released ? `${game.name} is up to date` : `${game.name} is still TBA`, 'success'); };
  const syncWishlist = async () => { if (missingWishlistDates.length === 0) return; setSyncing(true); try { for (const game of missingWishlistDates) await checkWishlistGame(game, true); onNotify?.(`Checked ${missingWishlistDates.length} wishlist release${missingWishlistDates.length === 1 ? '' : 's'}`, 'success'); } catch (e) { onNotify?.(`Could not finish checking dates: ${(e as Error).message}`, 'error'); } finally { setSyncing(false); } };
  const checkAll = async () => { if (entries.length === 0) return; setSyncing(true); try { for (const game of wishlist) await checkWishlistGame(game, true); for (const rec of watchedReleases) await checkReleaseDate(rec.id); onNotify?.('Release dates and review scores are up to date', 'success'); } catch (e) { onNotify?.(`Some releases could not be checked: ${(e as Error).message}`, 'error'); } finally { setSyncing(false); } };
  const addRecommendationToWishlist = async (rec: GameRecommendation) => { if (wishlistNames.has(rec.gameName.toLowerCase())) { await markWishlisted(rec.id); return; } await onAddGame({ name: rec.gameName, price: 0, hours: 0, rating: 0, status: 'Wishlist', genre: rec.genre, platform: rec.platform, thumbnail: rec.thumbnail, rawgId: rec.rawgId, releaseDate: rec.releaseDate, releaseDateStatus: releaseStatus(rec.releaseDate), releaseDateCheckedAt: rec.releaseDateCheckedAt || new Date().toISOString(), releaseDateSource: rec.releaseDateSource === 'sample' ? 'sample' : 'rawg', releaseExcitement: rec.releaseExcitement ?? 'interested', anticipationNote: rec.anticipationNote, metacriticScore: rec.metacritic, rawgRating: rec.rawgRating }); await markWishlisted(rec.id); onNotify?.(`${rec.gameName} added to Wishlist`, 'success'); };
  const setEntryExcitement = async (entry: RadarEntry, excitement: ReleaseExcitement) => { if (entry.source === 'wishlist') await onUpdateGame(entry.id, { releaseExcitement: excitement }); else await updateRecommendation(entry.id, { status: 'watching', releaseExcitement: excitement, respondedAt: new Date().toISOString() }); };
  const saveEntryNote = async (entry: RadarEntry, note: string) => { if (entry.source === 'wishlist') await onUpdateGame(entry.id, { anticipationNote: note || undefined }); else await updateRecommendation(entry.id, { anticipationNote: note || undefined }); onNotify?.('Radar note saved', 'success'); };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.09] via-white/[0.025] to-violet-500/[0.08] p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60"><Radar size={13} /> Release Radar</div><h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">What are you counting down to?</h2><p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/40 sm:text-sm">Track the dates, the review signal, and exactly how hyped you are.</p></div><button onClick={checkAll} disabled={syncing || entries.length === 0} aria-label="Check all release dates and scores" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-black/15 px-3 text-[11px] font-medium text-white/50 hover:text-white/80 disabled:opacity-30"><RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh signal</span></button></div>
        {featured ? <button onClick={() => setSelectedKey(featured.key)} className="relative mt-5 flex w-full overflow-hidden rounded-2xl border border-cyan-300/15 bg-black/20 text-left hover:border-cyan-300/30">{featured.thumbnail && <img src={featured.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}<div className="absolute inset-0 bg-gradient-to-r from-[#111118]/95 via-[#111118]/75 to-violet-950/40" /><div className="relative flex w-full items-center justify-between gap-4 p-4 sm:p-5"><div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">Next on your radar</div><div className="mt-1 truncate text-lg font-bold text-white sm:text-xl">{featured.name}</div><div className="mt-1 flex items-center gap-2 text-xs text-white/45"><span>{formatReleaseDate(featured.releaseDate)}</span><span>·</span><ScoreSignal metacritic={featured.metacritic} rawgRating={featured.rawgRating} /></div></div><div className="shrink-0 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.08] px-4 py-3 text-center"><div className="text-3xl font-black tracking-tight text-cyan-100">{getReleaseCountdown(featured.releaseDate) ?? 'TBA'}</div><div className="text-[9px] uppercase tracking-[0.16em] text-cyan-200/45">days to go</div></div></div></button> : <div className="relative mt-5 rounded-2xl border border-dashed border-white/[0.08] p-5 text-center text-xs text-white/30">Your next big countdown will live here.</div>}
        <div className="relative mt-3 grid grid-cols-3 gap-2">{[{ value: entries.length, label: 'Tracked' }, { value: datedCount, label: 'Dated' }, { value: mustPlayCount, label: 'Must play' }].map(stat => <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5"><div className="text-lg font-semibold text-white/85">{stat.value}</div><div className="text-[9px] uppercase tracking-wider text-white/30">{stat.label}</div></div>)}</div>
      </section>
      {missingWishlistDates.length > 0 && <button onClick={syncWishlist} disabled={syncing} className="group flex w-full items-center gap-3 rounded-2xl border border-amber-400/10 bg-amber-400/[0.045] p-3.5 text-left hover:border-amber-400/20"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><CalendarDays size={18} /></div><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-white/80">Complete your release radar</div><div className="mt-0.5 text-[10px] text-white/35">Check {missingWishlistDates.length} wishlist game{missingWishlistDates.length === 1 ? '' : 's'} for dates and review scores</div></div>{syncing ? <Loader2 size={15} className="animate-spin text-amber-300" /> : <ChevronRight size={15} className="text-white/20 group-hover:text-amber-300" />}</button>}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.025] p-1">{([{ id: 'radar', label: 'My Radar', icon: Eye, count: entries.length }, { id: 'picks', label: 'AI Picks', icon: Sparkles, count: upcomingPicks.length }] as const).map(item => <button key={item.id} onClick={() => setView(item.id)} aria-pressed={view === item.id} className={clsx('flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all', view === item.id ? 'border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-200' : 'text-white/35 hover:text-white/60')}><item.icon size={13} /> {item.label} <span className="text-[9px] opacity-50">{item.count}</span></button>)}</div>
      {error && <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300/80">{error.message}</div>}
      {view === 'radar' && (entries.length > 0 ? <div className="space-y-5"><div className="flex gap-1.5 overflow-x-auto pb-1">{([{ id: 'all', label: 'All' }, ...EXCITEMENT.map(item => ({ id: item.id, label: item.label })), { id: 'released', label: 'Released' }] as Array<{ id: RadarFilter; label: string }>).map(item => <button key={item.id} onClick={() => setFilter(item.id)} className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium', filter === item.id ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-white/[0.06] text-white/30 hover:text-white/55')}>{item.label}</button>)}</div>{filteredEntries.length > 0 ? Array.from(groupedEntries.entries()).map(([group, groupEntries]) => <section key={group} className="space-y-2.5"><div className="flex items-center gap-2"><Clock3 size={12} className="text-cyan-300/60" /><h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{group}</h3><span className="text-[9px] text-white/20">{groupEntries.length}</span></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{groupEntries.map(entry => { const game = entry.source === 'wishlist' ? wishlist.find(item => item.id === entry.id) : undefined; const rec = entry.source === 'recommendation' ? watchedReleases.find(item => item.id === entry.id) : undefined; return <SavedReleaseCard key={entry.key} entry={entry} isChecking={checkingIds.has(entry.id)} onOpen={() => setSelectedKey(entry.key)} onCheck={() => withChecking(entry.id, () => game ? checkWishlistGame(game) : checkReleaseDate(entry.id))} onExcitement={value => void setEntryExcitement(entry, value)} onWishlist={rec ? () => void addRecommendationToWishlist(rec) : undefined} onRemove={() => game ? void onDeleteGame(game.id) : void markDismissed(entry.id)} />; })}</div></section>) : <div className="rounded-2xl border border-dashed border-white/[0.08] py-10 text-center text-xs text-white/30">No releases match this filter yet.</div>}</div> : <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center"><Eye size={28} className="mx-auto text-white/10" /><p className="mt-3 text-sm font-medium text-white/45">Nothing on your radar yet</p><p className="mx-auto mt-1 max-w-xs text-xs text-white/25">Open AI Picks and mark releases Interested, Excited, or Must Play.</p><button onClick={() => setView('picks')} className="mt-4 rounded-xl bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300">See AI Picks</button></div>)}
      {view === 'picks' && <div className="space-y-4"><button onClick={generateUpcoming} disabled={generatingUpcoming || games.length === 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-sm font-medium text-violet-200 hover:from-violet-500/15 hover:to-cyan-500/15 disabled:opacity-35">{generatingUpcoming ? <><Loader2 size={15} className="animate-spin" /> AI is scanning upcoming releases…</> : <><WandSparkles size={15} /> {upcomingPicks.length ? 'Refresh AI picks' : 'Find releases for me'}</>}</button>{loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/20" /></div> : upcomingPicks.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[...upcomingPicks].sort((a, b) => (b.hypeScore ?? 0) - (a.hypeScore ?? 0)).map(rec => <AiPickCard key={rec.id} recommendation={rec} onExcitement={value => void updateRecommendation(rec.id, { status: 'watching', releaseExcitement: value, respondedAt: new Date().toISOString() })} onWishlist={() => void addRecommendationToWishlist(rec)} onDismiss={() => void markDismissed(rec.id)} />)}</div> : !generatingUpcoming && <div className="rounded-2xl border border-dashed border-white/[0.08] py-12 text-center"><Sparkles size={28} className="mx-auto text-violet-300/15" /><p className="mt-3 text-sm font-medium text-white/45">Your signal is ready</p><p className="mx-auto mt-1 max-w-xs text-xs text-white/25">AI uses your library and play history to choose the strongest upcoming matches.</p></div>}</div>}
      <div className="flex items-center justify-center gap-2 pt-1 text-[9px] text-white/20"><Check size={10} /> Dates and aggregate scores come from RAWG. AI only ranks relevance.</div>
      {selectedEntry && <ReleaseDetails entry={selectedEntry} onClose={() => setSelectedKey(null)} onExcitement={value => void setEntryExcitement(selectedEntry, value)} onSaveNote={note => void saveEntryNote(selectedEntry, note)} onStartPlaying={selectedEntry.source === 'wishlist' ? async () => { await onUpdateGame(selectedEntry.id, { status: 'In Progress', startDate: new Date().toISOString().slice(0, 10) }); setSelectedKey(null); onNotify?.(`${selectedEntry.name} moved to Playing`, 'success'); } : undefined} />}
    </div>
  );
}
