'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, Gamepad2, ShoppingBag, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  StoryRangeOption,
  resolveStoryRange,
  getGameChronicle,
  chronicleStretchBlurb,
  PlayStretch,
  GameChroniclePurchase,
  parseLocalDate,
} from '../lib/calculations';
import { generateChronicleBlurbs, ChronicleStretchInput } from '../lib/ai-game-service';

interface StorySoFarProps {
  games: Game[];
}

const RANGE_OPTIONS: { value: StoryRangeOption; label: string }[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'year-so-far', label: 'Year So Far' },
  { value: 'last-year', label: 'Last Year' },
  { value: 'this-year', label: 'This Year' },
];

function fmtDay(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function fmtHours(h: number): string {
  if (h >= 1) return `${h % 1 === 0 ? h : h.toFixed(1)} hrs`;
  return `${Math.round(h * 60)} min`;
}

function dateRangeLabel(st: PlayStretch): string {
  if (st.startDate === st.endDate) return fmtDay(st.startDate);
  return `${fmtDay(st.startDate)} – ${fmtDay(st.endDate)}`;
}

const CADENCE_STYLES: Record<PlayStretch['cadence'], string> = {
  binge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  steady: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'one-off': 'bg-white/5 text-gray-400 border-white/10',
};

export function StorySoFar({ games }: StorySoFarProps) {
  const [range, setRange] = useState<StoryRangeOption>('year-so-far');
  const [blurbs, setBlurbs] = useState<Record<string, string>>({});
  const [loadingBlurbs, setLoadingBlurbs] = useState(false);

  const chronicle = useMemo(() => {
    const resolved = resolveStoryRange(range);
    return getGameChronicle(games, resolved);
  }, [games, range]);

  // Fetch AI blurbs for the current range (batched). Template blurbs show
  // instantly; AI replaces them when ready.
  useEffect(() => {
    let cancelled = false;
    if (chronicle.stretches.length === 0) {
      setBlurbs({});
      return;
    }
    const inputs: ChronicleStretchInput[] = chronicle.stretches.map(st => ({
      key: st.key,
      name: st.gameName,
      genre: st.genre,
      hours: st.totalHours,
      days: st.daysActive,
      sessions: st.sessionCount,
      cadenceLabel: st.cadenceLabel,
      isReturn: st.isReturn,
      rating: st.rating,
      completed: st.completedInStretch,
      startLabel: fmtDay(st.startDate),
    }));

    setLoadingBlurbs(true);
    generateChronicleBlurbs(range, inputs)
      .then(map => {
        if (!cancelled) setBlurbs(map);
      })
      .finally(() => {
        if (!cancelled) setLoadingBlurbs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chronicle, range]);

  // Group stretches + purchases by month for the scrollable list (newest first).
  const months = useMemo(() => {
    return [...chronicle.monthKeys].reverse().map(monthKey => ({
      monthKey,
      stretches: chronicle.stretches.filter(s => s.monthKey === monthKey),
      purchases: chronicle.purchases.filter(p => p.monthKey === monthKey),
    }));
  }, [chronicle]);

  const isEmpty = chronicle.stretches.length === 0 && chronicle.purchases.length === 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/[0.07] to-transparent p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
          <BookOpen size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Your Story So Far</h2>
          <p className="text-xs text-gray-400">What you played, in order — and for how long.</p>
        </div>
      </div>

      {/* Range picker */}
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              range === opt.value
                ? 'border-purple-400/50 bg-purple-500/25 text-white'
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary line */}
      {!isEmpty && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
          <span className="inline-flex items-center gap-1.5">
            <Gamepad2 size={14} className="text-purple-300" />
            <strong className="text-white">{chronicle.uniqueGames}</strong> game{chronicle.uniqueGames !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} className="text-purple-300" />
            <strong className="text-white">{fmtHours(chronicle.totalHours)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={14} className="text-purple-300" />
            <strong className="text-white">{chronicle.totalSessions}</strong> session{chronicle.totalSessions !== 1 ? 's' : ''}
          </span>
          {loadingBlurbs && (
            <span className="inline-flex items-center gap-1.5 text-xs text-purple-300/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-300" />
              writing your story…
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-gray-400">
            No gaming activity in <strong className="text-gray-300">{chronicle.range.label.toLowerCase()}</strong> yet.
            Pick another range, or log some play sessions to start your story.
          </p>
        </div>
      )}

      {/* The scrollable chronicle */}
      <div className="space-y-7">
        {months.map(({ monthKey, stretches, purchases }) => (
          <div key={monthKey}>
            {/* Month header */}
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">{fmtMonth(monthKey)}</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 to-transparent" />
            </div>

            <div className="space-y-2.5">
              {/* Purchases that aren't also played stretches this month show as a buy note */}
              {purchases
                .filter(p => !stretches.some(s => s.gameId === p.gameId))
                .map(p => (
                  <PurchaseRow key={`buy-${p.gameId}`} purchase={p} />
                ))}

              {/* Play stretches */}
              {stretches.map(st => (
                <StretchRow
                  key={st.key}
                  stretch={st}
                  blurb={blurbs[st.key] || chronicleStretchBlurb(st)}
                  boughtThisMonth={purchases.some(p => p.gameId === st.gameId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StretchRow({ stretch, blurb, boughtThisMonth }: { stretch: PlayStretch; blurb: string; boughtThisMonth: boolean }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]">
      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {stretch.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stretch.thumbnail} alt={stretch.gameName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">
            <Gamepad2 size={22} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold text-white">{stretch.gameName}</span>
          {stretch.isReturn && (
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
              <RotateCcw size={10} /> came back
            </span>
          )}
          {boughtThisMonth && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              <ShoppingBag size={10} /> bought it
            </span>
          )}
          {stretch.completedInStretch && (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-300">
              <CheckCircle2 size={10} /> finished
            </span>
          )}
        </div>

        {/* Stats line */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
          <span>{dateRangeLabel(stretch)}</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-300">{stretch.daysActive} day{stretch.daysActive !== 1 ? 's' : ''}</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-300">{fmtHours(stretch.totalHours)}</span>
          <span
            className={clsx(
              'ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
              CADENCE_STYLES[stretch.cadence]
            )}
          >
            {stretch.cadenceLabel}
          </span>
        </div>

        {/* Blurb */}
        {blurb && <p className="mt-1.5 text-xs italic leading-snug text-gray-300/90">{blurb}</p>}
      </div>
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: GameChroniclePurchase }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-2.5">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {purchase.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={purchase.thumbnail} alt={purchase.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-emerald-600/60">
            <ShoppingBag size={16} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium text-white">{purchase.name}</span>
        <span className="text-gray-400">
          {' '}— bought {fmtDay(purchase.date)} for ${purchase.price}
          {!purchase.played && <span className="text-amber-400/80"> · still untouched</span>}
        </span>
      </div>
    </div>
  );
}
