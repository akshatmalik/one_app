'use client';

import { useMemo, useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight, Gamepad2, ShoppingBag, Clock, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  parseLocalDate,
  toDateKey,
  getRangePlaySummary,
  getRangePurchaseSummary,
} from '../lib/calculations';
import { RatingStars } from './RatingStars';

// ── Shared helpers ───────────────────────────────────────────────────────────

function startOfYearKey(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function todayKey(): string {
  return toDateKey(new Date());
}

function fmtDay(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtHours(h: number): string {
  if (h >= 1) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  return `${Math.round(h * 60)}m`;
}

function fmtMoney(n: number): string {
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

/** Collapsible block shell: title + icon + at-a-glance summary even when collapsed. */
function CollapsibleBlock({
  icon,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-purple-300 shrink-0">{icon}</span>
        <span className="font-semibold text-white shrink-0">{title}</span>
        <span className="text-xs text-gray-400 truncate flex-1">{summary}</span>
        {open ? <ChevronDown size={18} className="text-gray-400 shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function DateRange({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-3">
      <CalendarDays size={14} className="text-gray-500" />
      <input
        type="date"
        value={start}
        max={end}
        onChange={e => onStart(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-200 [color-scheme:dark]"
      />
      <span>→</span>
      <input
        type="date"
        value={end}
        min={start}
        onChange={e => onEnd(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-200 [color-scheme:dark]"
      />
    </div>
  );
}

function SortButton<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-1">Sort</span>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
            value === o.value ? 'bg-purple-500/25 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Thumb({ src, alt, fallback }: { src?: string; alt: string; fallback: ReactNode }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-600">{fallback}</div>
      )}
    </div>
  );
}

// ── Played block ─────────────────────────────────────────────────────────────

type PlayedSort = 'hours' | 'days' | 'rating' | 'name' | 'last';

const PLAYED_SORTS: { value: PlayedSort; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name' },
  { value: 'last', label: 'Last played' },
];

export function PlayedSummary({ games }: { games: Game[] }) {
  const [start, setStart] = useState(startOfYearKey());
  const [end, setEnd] = useState(todayKey());
  const [sortBy, setSortBy] = useState<PlayedSort>('hours');

  const summary = useMemo(
    () => getRangePlaySummary(games, parseLocalDate(start), parseLocalDate(end)),
    [games, start, end]
  );

  const sortedRows = useMemo(() => {
    const rows = [...summary.rows];
    switch (sortBy) {
      case 'hours': rows.sort((a, b) => b.hours - a.hours); break;
      case 'days': rows.sort((a, b) => b.daysPlayed - a.daysPlayed); break;
      case 'rating': rows.sort((a, b) => b.rating - a.rating); break;
      case 'name': rows.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'last': rows.sort((a, b) => parseLocalDate(b.lastPlayed).getTime() - parseLocalDate(a.lastPlayed).getTime()); break;
    }
    return rows;
  }, [summary.rows, sortBy]);

  const maxHours = Math.max(1, ...summary.rows.map(r => r.hours));

  const headerSummary = summary.totalGames > 0
    ? `Played ${summary.totalDaysPlayed} / ${summary.totalDaysInRange} days · ${fmtHours(summary.totalHours)} · ${summary.totalGames} game${summary.totalGames !== 1 ? 's' : ''}`
    : 'No play sessions in range';

  return (
    <CollapsibleBlock icon={<Gamepad2 size={18} />} title="Played" summary={headerSummary}>
      <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />

      {summary.totalGames === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No games played in this date range.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
              <Clock size={13} className="text-purple-300" />
              {summary.totalDaysPlayed} of {summary.totalDaysInRange} days active · {fmtHours(summary.totalHours)}
            </span>
            <SortButton options={PLAYED_SORTS} value={sortBy} onChange={setSortBy} />
          </div>

          <div className="space-y-1.5">
            {sortedRows.map(row => (
              <div key={row.gameId} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-2.5 py-2">
                <Thumb src={row.thumbnail} alt={row.name} fallback={<Gamepad2 size={16} />} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{row.name}</span>
                    <RatingStars rating={row.rating} size={11} />
                  </div>
                  {/* Mini hours bar */}
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400"
                      style={{ width: `${(row.hours / maxHours) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-white">{fmtHours(row.hours)}</div>
                  <div className="text-[11px] text-gray-400">{row.daysPlayed} day{row.daysPlayed !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </CollapsibleBlock>
  );
}

// ── Bought block ─────────────────────────────────────────────────────────────

type BoughtSort = 'date' | 'price' | 'name';

const BOUGHT_SORTS: { value: BoughtSort; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'price', label: 'Price' },
  { value: 'name', label: 'Name' },
];

export function BoughtSummary({ games }: { games: Game[] }) {
  const [start, setStart] = useState(startOfYearKey());
  const [end, setEnd] = useState(todayKey());
  const [sortBy, setSortBy] = useState<BoughtSort>('date');
  const [excludeFree, setExcludeFree] = useState(true);

  const summary = useMemo(
    () => getRangePurchaseSummary(games, parseLocalDate(start), parseLocalDate(end), excludeFree),
    [games, start, end, excludeFree]
  );

  const sortedRows = useMemo(() => {
    const rows = [...summary.rows];
    switch (sortBy) {
      case 'date': rows.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()); break;
      case 'price': rows.sort((a, b) => b.price - a.price); break;
      case 'name': rows.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return rows;
  }, [summary.rows, sortBy]);

  const headerSummary = summary.totalCount > 0
    ? `${fmtMoney(summary.totalSpent)} spent${summary.totalSaved > 0 ? ` · ${fmtMoney(summary.totalSaved)} saved` : ''} · ${summary.totalCount} game${summary.totalCount !== 1 ? 's' : ''}`
    : 'No purchases in range';

  return (
    <CollapsibleBlock icon={<ShoppingBag size={18} />} title="Bought" summary={headerSummary}>
      <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeFree}
            onChange={e => setExcludeFree(e.target.checked)}
            className="accent-purple-500"
          />
          Exclude free / subscription games
        </label>
        <SortButton options={BOUGHT_SORTS} value={sortBy} onChange={setSortBy} />
      </div>

      {summary.totalCount === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No games bought in this date range.</p>
      ) : (
        <>
          <div className="mb-2 text-xs text-gray-300">
            <span className="text-white font-semibold">{fmtMoney(summary.totalSpent)}</span> spent
            {summary.totalSaved > 0 && (
              <> · <span className="text-emerald-400 font-semibold">{fmtMoney(summary.totalSaved)}</span> saved in discounts</>
            )}
          </div>

          <div className="space-y-1.5">
            {sortedRows.map(row => (
              <div key={row.gameId} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-2.5 py-2">
                <Thumb src={row.thumbnail} alt={row.name} fallback={<ShoppingBag size={15} />} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{row.name}</span>
                    {row.freeLabel && (
                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                        {row.freeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">{fmtDay(row.date)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-white">{row.price === 0 ? 'Free' : fmtMoney(row.price)}</div>
                  {row.saved > 0 && <div className="text-[11px] text-emerald-400">−{fmtMoney(row.saved)}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </CollapsibleBlock>
  );
}
