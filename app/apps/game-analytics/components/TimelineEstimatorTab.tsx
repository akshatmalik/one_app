'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CalendarClock, AlarmClock, TrendingUp, ShoppingCart, Sparkles, Loader2,
  Wallet, Gamepad2, ArrowRight, Tag, ExternalLink, AlertTriangle, CheckCircle2,
  Clock, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { Game, PurchaseQueueEntry } from '../lib/types';
import { getUserGamingPace } from '../lib/calculations';
import {
  buildPlaythroughTimeline, detectGap, matchInterimGames, buildPurchaseCalendar,
  computeScenarios, getRemainingHours,
  UpcomingRelease,
} from '../lib/timeline-estimator';
import { loadEstimatorSettings, saveEstimatorSettings, EstimatorSettings } from '../lib/estimator-settings';
import { lookupGameLength } from '../lib/ai-timeline-service';
import { fetchDeals, getDealLink, CheapSharkDeal } from '../lib/cheapshark-api';

interface TimelineEstimatorTabProps {
  userId: string | null;
  queuedGames: Game[];        // ordered Up Next queue (active first)
  allGames: Game[];
  upcomingEntries: PurchaseQueueEntry[]; // buy-queue entries releasing in the future
  annualBudget: number | null;
  yearSpent: number;
  onUpdateGame: (id: string, updates: Partial<Game>) => Promise<Game>;
  onGoToQueue?: () => void;
}

function fmtDate(d: Date | null): string {
  if (!d) return 'TBA';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function humanizeWeeks(weeks: number): string {
  if (weeks <= 0) return 'now';
  if (weeks < 1) return `${Math.round(weeks * 7)} days`;
  if (weeks < 8) return `${weeks.toFixed(1)} weeks`;
  return `${(weeks / 4.345).toFixed(1)} months`;
}

export function TimelineEstimatorTab({
  userId, queuedGames, allGames, upcomingEntries, annualBudget, yearSpent,
  onUpdateGame, onGoToQueue,
}: TimelineEstimatorTabProps) {
  const pace = useMemo(() => getUserGamingPace(allGames), [allGames]);
  const [settings, setSettings] = useState<EstimatorSettings>(() =>
    loadEstimatorSettings(userId || 'local-user', pace)
  );

  // Persist whenever the user tweaks the pace knobs.
  useEffect(() => {
    saveEstimatorSettings(userId || 'local-user', settings);
  }, [settings, userId]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const activeQueue = useMemo(
    () => queuedGames.filter(g => g.status !== 'Completed' && g.status !== 'Abandoned'),
    [queuedGames]
  );
  const queuedIds = useMemo(() => new Set(queuedGames.map(g => g.id)), [queuedGames]);

  const timeline = useMemo(
    () => buildPlaythroughTimeline(activeQueue, settings.weeklyHours, today, allGames),
    [activeQueue, settings.weeklyHours, today, allGames]
  );

  const upcomingReleases: UpcomingRelease[] = useMemo(() =>
    upcomingEntries
      .filter(e => e.releaseDate)
      .map(e => ({
        id: e.id,
        name: e.gameName,
        date: new Date(e.releaseDate as string),
        price: e.targetPrice ?? e.currentPrice ?? e.msrpEstimate ?? 70,
        isDayOne: e.isDayOneBuy,
        thumbnail: e.thumbnail,
      })),
    [upcomingEntries]
  );

  const queueEndDate = timeline.length > 0 ? timeline[timeline.length - 1].endDate : today;
  const gap = useMemo(
    () => detectGap(queueEndDate, upcomingReleases, settings.weeklyHours),
    [queueEndDate, upcomingReleases, settings.weeklyHours]
  );

  const interim = useMemo(
    () => matchInterimGames(gap.gapHours, settings.weeklyHours, allGames, queuedIds),
    [gap.gapHours, settings.weeklyHours, allGames, queuedIds]
  );

  const purchaseCalendar = useMemo(
    () => buildPurchaseCalendar(upcomingEntries, annualBudget, yearSpent),
    [upcomingEntries, annualBudget, yearSpent]
  );

  const scenarios = useMemo(() => computeScenarios(activeQueue, allGames, today, [
    { label: 'Low', weeklyHours: settings.lowPace },
    { label: 'Mid', weeklyHours: settings.weeklyHours },
    { label: 'High', weeklyHours: settings.highPace },
  ]), [activeQueue, allGames, today, settings]);

  const totalRemaining = useMemo(
    () => activeQueue.reduce((sum, g) => sum + getRemainingHours(g, allGames), 0),
    [activeQueue, allGames]
  );

  // ── AI length lookup for queued games missing an estimate ──────────
  const missingLength = useMemo(
    () => activeQueue.filter(g => !(g.expectedHours && g.expectedHours > 0)),
    [activeQueue]
  );
  const [estimatingAll, setEstimatingAll] = useState(false);
  const handleEstimateAll = useCallback(async () => {
    setEstimatingAll(true);
    try {
      for (const g of missingLength) {
        const res = await lookupGameLength(g.name, g.platform);
        if (res.hours) await onUpdateGame(g.id, { expectedHours: res.hours });
      }
    } finally {
      setEstimatingAll(false);
    }
  }, [missingLength, onUpdateGame]);

  // ── CheapShark deal search to fill the gap cheaply ─────────────────
  const [deals, setDeals] = useState<CheapSharkDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsSearched, setDealsSearched] = useState(false);
  const handleFindDeals = useCallback(async () => {
    setDealsLoading(true);
    setDealsSearched(true);
    try {
      // Cheap, well-reviewed games on sale right now make the best gap fillers.
      const results = await fetchDeals({ onSale: true, sortBy: 'Savings', upperPrice: 30, metacritic: 70, pageSize: 8 });
      setDeals(results);
    } catch {
      setDeals([]);
    } finally {
      setDealsLoading(false);
    }
  }, []);

  const updatePace = (key: keyof EstimatorSettings, value: number) =>
    setSettings(prev => ({ ...prev, [key]: Math.max(0.5, value) }));

  // ── Empty state ────────────────────────────────────────────────────
  if (activeQueue.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarClock size={48} className="mx-auto mb-4 text-white/10" />
        <p className="text-white/40 text-sm">Nothing lined up to estimate yet</p>
        <p className="text-white/25 text-xs mt-1 max-w-xs mx-auto">
          Add games to your Up Next queue — the estimator turns that order into completion dates and a purchase calendar.
        </p>
        {onGoToQueue && (
          <button
            onClick={onGoToQueue}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-sm transition-all"
          >
            <Gamepad2 size={16} /> Go to Up Next
          </button>
        )}
      </div>
    );
  }

  const gapColor =
    gap.severity === 'long' ? 'text-red-400 border-red-500/30 bg-red-500/5'
    : gap.severity === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
    : gap.severity === 'open-ended' ? 'text-white/50 border-white/10 bg-white/[0.02]'
    : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarClock size={24} className="text-purple-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Timeline Estimator</h2>
          <p className="text-xs text-white/40">When you&apos;ll finish, and what to buy next</p>
        </div>
      </div>

      {/* Pace controls */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/80 flex items-center gap-2">
            <Clock size={15} className="text-white/40" /> Your weekly pace
          </span>
          {pace > 0 && (
            <span className="text-[11px] text-white/35">recent actual: ~{pace.toFixed(1)} h/wk</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'lowPace' as const, label: 'Low' },
            { key: 'weeklyHours' as const, label: 'Main' },
            { key: 'highPace' as const, label: 'High' },
          ]).map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[11px] text-white/40">{label} (h/wk)</span>
              <input
                type="number" step="0.5" min="0.5"
                value={settings[key]}
                onChange={e => updatePace(key, parseFloat(e.target.value) || 0)}
                className={clsx(
                  'w-full mt-1 px-3 py-2 bg-white/[0.03] border rounded-lg text-sm text-white focus:outline-none transition-all',
                  key === 'weeklyHours' ? 'border-purple-500/30 focus:border-purple-500/60' : 'border-white/5 focus:border-white/10'
                )}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Missing-length nudge */}
      {missingLength.length > 0 && (
        <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between gap-3">
          <p className="text-xs text-white/60">
            {missingLength.length} queued game{missingLength.length !== 1 ? 's' : ''} {missingLength.length !== 1 ? 'have' : 'has'} no length set — using genre estimates for now.
          </p>
          <button
            onClick={handleEstimateAll}
            disabled={estimatingAll}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600/40 disabled:opacity-50 text-xs font-medium transition-all"
          >
            {estimatingAll ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {estimatingAll ? 'Looking up…' : 'Estimate all with AI'}
          </button>
        </div>
      )}

      {/* Completion timeline */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-400" /> Completion Timeline
          </h3>
          <span className="text-[11px] text-white/40">{Math.round(totalRemaining)}h left · done {fmtDate(queueEndDate)}</span>
        </div>
        <div className="space-y-2">
          {timeline.map((seg, i) => (
            <div key={seg.game.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              {seg.game.thumbnail && (
                <img src={seg.game.thumbnail} alt={seg.game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{seg.game.name}</p>
                <p className="text-[11px] text-white/40">
                  {Math.round(seg.remainingHours)}h left · {humanizeWeeks(seg.weeks)}
                  {seg.isEstimatedLength && <span className="text-white/25"> · est. length</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/30 uppercase tracking-wide">Done</p>
                <p className="text-xs font-semibold text-white/80">{fmtDate(seg.endDate)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gap analysis */}
      <section className={clsx('p-4 rounded-xl border space-y-2', gapColor)}>
        <div className="flex items-center gap-2">
          {gap.severity === 'long' || gap.severity === 'open-ended'
            ? <AlertTriangle size={16} />
            : <CheckCircle2 size={16} />}
          <h3 className="text-sm font-semibold">
            {gap.severity === 'open-ended' ? 'Nothing lined up after your queue'
              : gap.severity === 'long' ? 'Long gap ahead'
              : gap.severity === 'medium' ? 'Moderate gap ahead'
              : 'Seamless — next release lands right on time'}
          </h3>
        </div>
        <p className="text-xs opacity-80">
          {gap.nextRelease ? (
            <>You&apos;ll wrap your queue around <strong>{fmtDate(gap.queueEndDate)}</strong>, and{' '}
              <strong>{gap.nextRelease.name}</strong> releases <strong>{fmtDate(gap.nextRelease.date)}</strong> —
              a {humanizeWeeks(gap.gapWeeks)} gap.</>
          ) : (
            <>You&apos;ll wrap your queue around <strong>{fmtDate(gap.queueEndDate)}</strong> with no upcoming
              releases tracked after that. Add releases in the Buy Queue, or fill the time with your backlog.</>
          )}
        </p>
      </section>

      {/* Interim recommendations (owned backlog) */}
      {interim.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Gamepad2 size={15} className="text-emerald-400" /> Fill the gap — from your backlog (free, already owned)
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {interim.map(s => (
              <div key={s.game.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                {s.game.thumbnail && (
                  <img src={s.game.thumbnail} alt={s.game.name} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{s.game.name}</p>
                  <p className="text-[11px] text-white/40">
                    ~{s.expectedHours}h · {humanizeWeeks(s.weeksToFinish)}
                  </p>
                </div>
                {s.fitsGap && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">fits</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discounted deals to fill the gap (live, CheapShark) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Tag size={15} className="text-amber-400" /> Cheap games on sale right now
          </h3>
          <button
            onClick={handleFindDeals}
            disabled={dealsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 text-xs font-medium transition-all"
          >
            {dealsLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {dealsLoading ? 'Searching…' : 'Find deals'}
          </button>
        </div>
        {dealsSearched && !dealsLoading && deals.length === 0 && (
          <p className="text-xs text-white/35">No deals found right now — try again later.</p>
        )}
        {deals.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {deals.map(deal => (
              <a
                key={deal.dealID}
                href={getDealLink(deal.dealID)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 transition-all group"
              >
                {deal.thumb && (
                  <img src={deal.thumb} alt={deal.title} className="w-12 h-10 rounded object-cover shrink-0" loading="lazy" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate group-hover:text-amber-300 transition-colors">{deal.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-400">${parseFloat(deal.salePrice).toFixed(2)}</span>
                    <span className="text-[11px] text-white/30 line-through">${parseFloat(deal.normalPrice).toFixed(2)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                      -{Math.round(parseFloat(deal.savings))}%
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-white/20 group-hover:text-amber-400 transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}
        <p className="text-[10px] text-white/25">Live PC store deals via CheapShark. Console prices may differ.</p>
      </section>

      {/* Purchase calendar */}
      {purchaseCalendar.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <ShoppingCart size={15} className="text-purple-400" /> Purchase Calendar
          </h3>
          <div className="space-y-2">
            {purchaseCalendar.map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                {row.thumbnail && (
                  <img src={row.thumbnail} alt={row.name} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white/90 truncate">{row.name}</p>
                    {row.isDayOne && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 shrink-0">day one</span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40">{fmtDate(row.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white/85">${row.price.toFixed(0)}</p>
                  {row.remaining !== null && (
                    <p className={clsx('text-[10px]', row.remaining < 0 ? 'text-red-400' : 'text-white/35')}>
                      ${row.remaining.toFixed(0)} left
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {annualBudget !== null && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
              <span className="text-white/50 flex items-center gap-1.5"><Wallet size={13} /> Annual budget</span>
              <span className="text-white/70">
                ${(purchaseCalendar[purchaseCalendar.length - 1].cumulative).toFixed(0)} of ${annualBudget.toFixed(0)} planned
              </span>
            </div>
          )}
        </section>
      )}

      {/* Scenario comparison */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <AlarmClock size={15} className="text-cyan-400" /> Pace Scenarios — when you&apos;d clear the queue
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {scenarios.map(s => (
            <div key={s.label} className={clsx(
              'p-3 rounded-xl border text-center',
              s.label === 'Mid' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-white/[0.02] border-white/5'
            )}>
              <p className="text-[11px] text-white/40">{s.label} · {s.weeklyHours}h/wk</p>
              <p className="text-sm font-semibold text-white/85 mt-1 flex items-center justify-center gap-1">
                <ArrowRight size={12} className="text-white/30" /> {fmtDate(s.endDate)}
              </p>
              <p className="text-[10px] text-white/35 mt-0.5">{humanizeWeeks(s.weeks)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
