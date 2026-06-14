'use client';

import { Game } from '../lib/types';
import {
  getSessionHeatCalendar,
  getAcquisitionVsCompletion,
  getVaultGems,
  getBuyNextTypes,
} from '../lib/idea-analytics';
import { getTotalHours } from '../lib/calculations';
import { CalendarDays, TrendingUp, Archive, ShoppingBag } from 'lucide-react';

interface AnalyticsExtrasPanelProps {
  games: Game[];
}

function heatColor(hours: number, max: number): string {
  if (hours <= 0) return 'bg-white/[0.04]';
  const r = max > 0 ? hours / max : 0;
  if (r > 0.75) return 'bg-emerald-400';
  if (r > 0.5) return 'bg-emerald-500';
  if (r > 0.25) return 'bg-emerald-600/80';
  return 'bg-emerald-700/50';
}

// NewIdeas100-June2026 — Wave 3 analytics surfaced together.
export function AnalyticsExtrasPanel({ games }: AnalyticsExtrasPanelProps) {
  const heat = getSessionHeatCalendar(games);
  const race = getAcquisitionVsCompletion(games);
  const vault = getVaultGems(games);
  const buyNext = getBuyNextTypes(games);

  // Group heat days into weeks (columns) for a contribution-style grid.
  const weeks: Array<Array<{ date: string; hours: number }>> = [];
  for (let i = 0; i < heat.days.length; i += 7) weeks.push(heat.days.slice(i, i + 7));

  return (
    <div className="space-y-4">
      {/* Session Heat Calendar (#61) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <CalendarDays size={16} className="text-emerald-400" /> Session Heat Calendar
          </div>
          <span className="text-xs text-white/40">
            {heat.activeDays} active days · {heat.totalHours.toFixed(0)}h in a year
          </span>
        </div>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.hours.toFixed(1)}h`}
                  className={`h-2.5 w-2.5 rounded-sm ${heatColor(d.hours, heat.maxHours)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Acquisition vs Completion Race (#59) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <TrendingUp size={16} className="text-blue-400" /> Acquisition vs Completion
          </div>
          <p className="text-sm text-white/70">
            You're <span className="font-bold text-red-400">{race.currentGap}</span> game
            {race.currentGap !== 1 ? 's' : ''} behind — bought but not finished.
          </p>
          {race.points.length > 1 && (
            <div className="mt-3 flex h-16 items-end gap-1">
              {race.points.slice(-12).map((p) => {
                const max = Math.max(1, ...race.points.map((x) => x.acquired));
                return (
                  <div key={p.month} className="flex flex-1 flex-col justify-end" title={`${p.month}: gap ${p.gap}`}>
                    <div className="w-full rounded-sm bg-red-500/30" style={{ height: `${(p.acquired / max) * 100}%` }} />
                    <div className="w-full rounded-sm bg-emerald-500/60" style={{ height: `${(p.completed / max) * 100}%` }} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2 flex gap-3 text-[10px] text-white/40">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500/40" />Acquired</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500/60" />Completed</span>
          </div>
        </div>

        {/* The Vault (#70) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Archive size={16} className="text-amber-400" /> The Vault
          </div>
          <p className="mb-2 text-xs text-white/40">Owned games gathering dust — rediscover one.</p>
          {vault.length ? (
            <div className="space-y-1.5">
              {vault.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2 text-white/80">{g.name}</span>
                  <span className="text-xs text-white/40">{getTotalHours(g).toFixed(0)}h in</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30">Nothing forgotten — you keep your library active.</p>
          )}
        </div>
      </div>

      {/* What Should I Buy Next (#71) */}
      {buyNext.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <ShoppingBag size={16} className="text-purple-400" /> What to Buy Next
          </div>
          <p className="mb-2 text-xs text-white/40">The kinds of games that earn your highest satisfaction.</p>
          <div className="space-y-2">
            {buyNext.map((b) => (
              <div key={b.genre} className="rounded-lg bg-white/[0.03] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{b.genre}</span>
                  <span className="text-xs text-purple-300">{b.avgRating.toFixed(1)}/10 avg</span>
                </div>
                <p className="text-xs text-white/50">{b.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
