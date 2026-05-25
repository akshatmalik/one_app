'use client';

import { useState, useMemo } from 'react';
import {
  Atom, DollarSign, Star, Clock, Tag, TrendingDown,
  ChevronDown, ChevronUp, ArrowRight, Minus, Sparkles, Target,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  whatIfSkippedUnplayed,
  whatIfOnlyHighRated,
  whatIfBoughtAtFullPrice,
  whatIfCompletedBacklogScenario,
  whatIfPlayedMorePerDay,
  WhatIfScenarioData,
} from '../lib/calculations';
import clsx from 'clsx';

interface WhatIfSimulatorProps {
  games: Game[];
}

interface ScenarioCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  tagline: string;
  data: WhatIfScenarioData;
  metricType: 'money' | 'costPerHour';
  accentColor: string;
  children?: React.ReactNode; // for interactive controls
}

function ScenarioCard({ icon, iconBg, title, tagline, data, metricType, accentColor, children }: ScenarioCardProps) {
  if (!data.feasible) return null;

  const isMoneyScenario = metricType === 'money';
  const formattedBefore = isMoneyScenario
    ? `$${Math.round(data.before.value).toLocaleString()}`
    : `$${data.before.value.toFixed(2)}/hr`;
  const formattedAfter = isMoneyScenario
    ? `$${Math.round(data.after.value).toLocaleString()}`
    : `$${data.after.value.toFixed(2)}/hr`;

  return (
    <div className={clsx('p-4 rounded-xl border', accentColor)}>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white leading-tight">{title}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{tagline}</div>
        </div>
        {data.gamesAffectedLabel && (
          <div className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full shrink-0 self-start">
            {data.gamesAffectedLabel}
          </div>
        )}
      </div>

      {/* Interactive controls slot */}
      {children && <div className="mb-3">{children}</div>}

      {/* Before → After */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 p-2.5 bg-white/[0.03] rounded-lg text-center">
          <div className="text-[10px] text-white/30 mb-0.5">Reality</div>
          <div className="text-sm font-bold text-white/50 tabular-nums">{formattedBefore}</div>
        </div>
        <ArrowRight size={14} className="text-white/20 shrink-0" />
        <div className="flex-1 p-2.5 bg-white/[0.06] rounded-lg text-center border border-white/5">
          <div className="text-[10px] text-white/30 mb-0.5">Alternate</div>
          <div className="text-sm font-bold text-emerald-400 tabular-nums">{formattedAfter}</div>
        </div>
      </div>

      {/* Delta badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-400">
          {data.delta.label}
        </span>
        <span className="text-[10px] text-white/30 italic truncate max-w-[55%] text-right">
          {data.insightLine}
        </span>
      </div>
    </div>
  );
}

export function WhatIfSimulator({ games }: WhatIfSimulatorProps) {
  const [minRating, setMinRating] = useState(7);
  const [dailyHours, setDailyHours] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);

  const ownedGames = useMemo(() => games.filter(g => g.status !== 'Wishlist'), [games]);

  const skippedUnplayed = useMemo(() => whatIfSkippedUnplayed(games), [games]);
  const onlyHighRated = useMemo(() => whatIfOnlyHighRated(games, minRating), [games, minRating]);
  const fullPrice = useMemo(() => whatIfBoughtAtFullPrice(games), [games]);
  const completedBacklog = useMemo(() => whatIfCompletedBacklogScenario(games), [games]);
  const morePerDay = useMemo(() => whatIfPlayedMorePerDay(games, dailyHours), [games, dailyHours]);

  if (ownedGames.length < 3) return null;

  const feasibleCount = [skippedUnplayed, onlyHighRated, fullPrice, completedBacklog, morePerDay].filter(d => d.feasible).length;
  if (feasibleCount === 0) return null;

  // Headline: total money potentially "recoverable" (non-overlapping scenarios)
  const impulseTaxAmount = skippedUnplayed.feasible ? skippedUnplayed.delta.value : 0;
  const discountWinAmount = fullPrice.feasible ? fullPrice.delta.value : 0;
  const totalEdgeFound = impulseTaxAmount + discountWinAmount;

  return (
    <div className="p-4 bg-gradient-to-br from-purple-950/60 via-indigo-950/60 to-slate-900/60 border border-purple-500/20 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Atom size={15} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Alternate Realities</h3>
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-bold tracking-wide">
            WHAT IF?
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(v => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      <p className="text-[11px] text-white/35 mb-4">
        What would your library look like if things had gone differently?
      </p>

      {/* Headline summary */}
      {isExpanded && totalEdgeFound > 10 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
          <Sparkles size={14} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-white/60">Across your history, </span>
            <span className="text-xs font-semibold text-emerald-400">${Math.round(totalEdgeFound).toLocaleString()}</span>
            <span className="text-xs text-white/60"> of spending insight unlocked below</span>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3">

          {/* Scenario 1: The Barely-Played Tax */}
          <ScenarioCard
            icon={<Clock size={15} className="text-red-400" />}
            iconBg="bg-red-500/15"
            title="If you skipped games you barely played"
            tagline="Games with less than 2 hours total playtime"
            data={skippedUnplayed}
            metricType="money"
            accentColor="bg-red-500/[0.06] border-red-500/20"
          />

          {/* Scenario 2: The Taste Filter — with rating slider */}
          {onlyHighRated.feasible && (
            <div className="p-4 rounded-xl border bg-amber-500/[0.06] border-amber-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Star size={15} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white leading-tight">If you only bought {minRating}+/10 games</div>
                  <div className="text-[11px] text-white/40 mt-0.5">Adjust your hypothetical rating threshold</div>
                </div>
                <div className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full shrink-0 self-start">
                  {onlyHighRated.gamesAffectedLabel}
                </div>
              </div>

              {/* Rating slider */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/40">Min rating threshold</span>
                  <span className="text-sm font-bold text-amber-400">{minRating}/10</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={5}
                    max={9}
                    step={1}
                    value={minRating}
                    onChange={e => setMinRating(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between mt-1">
                    {[5, 6, 7, 8, 9].map(v => (
                      <span key={v} className={clsx('text-[9px]', v === minRating ? 'text-amber-400 font-bold' : 'text-white/25')}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Before → After */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 p-2.5 bg-white/[0.03] rounded-lg text-center">
                  <div className="text-[10px] text-white/30 mb-0.5">Reality</div>
                  <div className="text-sm font-bold text-white/50 tabular-nums">${Math.round(onlyHighRated.before.value).toLocaleString()}</div>
                </div>
                <ArrowRight size={14} className="text-white/20 shrink-0" />
                <div className="flex-1 p-2.5 bg-white/[0.06] rounded-lg text-center border border-white/5">
                  <div className="text-[10px] text-white/30 mb-0.5">Alternate</div>
                  <div className="text-sm font-bold text-emerald-400 tabular-nums">${Math.round(onlyHighRated.after.value).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">{onlyHighRated.delta.label}</span>
                <span className="text-[10px] text-white/30 italic truncate max-w-[55%] text-right">{onlyHighRated.insightLine}</span>
              </div>
            </div>
          )}

          {/* Scenario 3: The Discount Win */}
          <ScenarioCard
            icon={<Tag size={15} className="text-teal-400" />}
            iconBg="bg-teal-500/15"
            title="If discounts didn't exist"
            tagline="Shows how much your deals have actually saved you"
            data={fullPrice}
            metricType="money"
            accentColor="bg-teal-500/[0.06] border-teal-500/20"
          />

          {/* Scenario 4: Complete Your Backlog */}
          <ScenarioCard
            icon={<Target size={15} className="text-blue-400" />}
            iconBg="bg-blue-500/15"
            title="If you completed your entire backlog"
            tagline="Estimating ~20 hrs per unfinished game"
            data={completedBacklog}
            metricType="costPerHour"
            accentColor="bg-blue-500/[0.06] border-blue-500/20"
          />

          {/* Scenario 5: Daily Habit — with hours slider */}
          {morePerDay.feasible && (
            <div className="p-4 rounded-xl border bg-purple-500/[0.06] border-purple-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                  <TrendingDown size={15} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white leading-tight">
                    If you played {dailyHours}h extra/day for 30 days
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">See how daily gaming drops your $/hr</div>
                </div>
                <div className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full shrink-0 self-start">
                  {morePerDay.gamesAffectedLabel}
                </div>
              </div>

              {/* Hours slider */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/40">Extra hours per day</span>
                  <span className="text-sm font-bold text-purple-400">{dailyHours}h/day</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.5}
                    value={dailyHours}
                    onChange={e => setDailyHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-400"
                  />
                  <div className="flex justify-between mt-1">
                    {[0.5, 1, 1.5, 2, 2.5, 3].map(v => (
                      <span key={v} className={clsx('text-[9px]', v === dailyHours ? 'text-purple-400 font-bold' : 'text-white/25')}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Before → After */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 p-2.5 bg-white/[0.03] rounded-lg text-center">
                  <div className="text-[10px] text-white/30 mb-0.5">Reality</div>
                  <div className="text-sm font-bold text-white/50 tabular-nums">${morePerDay.before.value.toFixed(2)}/hr</div>
                </div>
                <ArrowRight size={14} className="text-white/20 shrink-0" />
                <div className="flex-1 p-2.5 bg-white/[0.06] rounded-lg text-center border border-white/5">
                  <div className="text-[10px] text-white/30 mb-0.5">Alternate</div>
                  <div className="text-sm font-bold text-emerald-400 tabular-nums">${morePerDay.after.value.toFixed(2)}/hr</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">{morePerDay.delta.label}</span>
                <span className="text-[10px] text-white/30 italic truncate max-w-[55%] text-right">{morePerDay.insightLine}</span>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
