'use client';

import { useState, useMemo } from 'react';
import {
  Wand2, Play, Ban, Archive, Tag, Star, ArrowRight,
  ChevronDown, ChevronUp, AlertCircle, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  whatIfMoreHours,
  whatIfNeverBought,
  whatIfCompletedBacklog,
  whatIfPriceLimit,
  whatIfHighRatedOnly,
  getTotalHours,
  getValueRating,
} from '../lib/calculations';
import clsx from 'clsx';

type ScenarioId = 'more-hours' | 'skip-duds' | 'backlog' | 'price-cap' | 'rating-filter';

const VALUE_COLORS = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Fair: 'text-yellow-400',
  Poor: 'text-red-400',
};

const VALUE_BG = {
  Excellent: 'bg-emerald-500/10 border-emerald-500/20',
  Good: 'bg-blue-500/10 border-blue-500/20',
  Fair: 'bg-yellow-500/10 border-yellow-500/20',
  Poor: 'bg-red-500/10 border-red-500/20',
};

function formatCph(v: number): string {
  return v > 0 ? `$${v.toFixed(2)}/hr` : '—';
}

function formatMoney(v: number): string {
  return `$${v.toFixed(0)}`;
}

function CphCell({ label, cph, sub }: { label: string; cph: number; sub?: string }) {
  const rating = cph > 0 ? getValueRating(cph) : 'Excellent';
  return (
    <div className={clsx('rounded-xl p-3 border', VALUE_BG[rating])}>
      <div className="text-[10px] text-white/40 mb-1">{label}</div>
      <div className={clsx('text-lg font-bold', VALUE_COLORS[rating])}>{formatCph(cph)}</div>
      <div className={clsx('text-[10px] font-medium mt-0.5', VALUE_COLORS[rating])}>{rating}</div>
      {sub && <div className="text-[9px] text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function DeltaBadge({ before, after, unit = '', lowerIsBetter = false }: {
  before: number; after: number; unit?: string; lowerIsBetter?: boolean;
}) {
  const delta = after - before;
  const isPositive = lowerIsBetter ? delta < 0 : delta > 0;
  const pct = before !== 0 ? Math.abs((delta / before) * 100).toFixed(0) : '0';
  if (Math.abs(delta) < 0.01) return <span className="text-white/30 text-xs">No change</span>;
  return (
    <span className={clsx('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
      {isPositive ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
      {isPositive ? '−' : '+'}{pct}% ({delta > 0 ? '+' : ''}{unit}{Math.abs(delta).toFixed(delta < 1 && delta > -1 ? 2 : 0)})
    </span>
  );
}

function ScenarioHeader({ label, icon, desc }: { label: string; icon: React.ReactNode; desc: string }) {
  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-white/40">{desc}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScenarioMoreHours({ games }: { games: Game[] }) {
  const eligibleGames = useMemo(
    () => games.filter(g => g.status !== 'Wishlist' && g.price > 0).sort((a, b) => a.name.localeCompare(b.name)),
    [games],
  );
  const [selectedId, setSelectedId] = useState(() => {
    // Default: game with highest CPH (most room to improve)
    const withCph = eligibleGames
      .filter(g => getTotalHours(g) > 0)
      .map(g => ({ id: g.id, cph: g.price / getTotalHours(g) }))
      .sort((a, b) => b.cph - a.cph);
    return withCph[0]?.id ?? eligibleGames[0]?.id ?? '';
  });
  const [extraHours, setExtraHours] = useState(20);

  const selectedGame = useMemo(() => eligibleGames.find(g => g.id === selectedId), [eligibleGames, selectedId]);

  const result = useMemo(() => {
    if (!selectedGame) return null;
    return whatIfMoreHours(selectedGame, extraHours);
  }, [selectedGame, extraHours]);

  const currentHours = selectedGame ? getTotalHours(selectedGame) : 0;
  const currentCph = selectedGame && currentHours > 0 ? selectedGame.price / currentHours : 0;

  // Hours to reach each value tier
  const hoursToTiers = useMemo(() => {
    if (!selectedGame || selectedGame.price <= 0) return null;
    const price = selectedGame.price;
    return {
      excellent: Math.max(0, price / 1 - currentHours),
      good: Math.max(0, price / 3 - currentHours),
      fair: Math.max(0, price / 5 - currentHours),
    };
  }, [selectedGame, currentHours]);

  if (eligibleGames.length === 0) {
    return <p className="text-white/30 text-sm">Add some games first to use this simulator.</p>;
  }

  return (
    <div className="space-y-4">
      <ScenarioHeader
        label="Play More Hours"
        icon={<Play size={14} />}
        desc="See how your cost-per-hour changes with more play time"
      />

      {/* Game selector */}
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Select game</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none"
        >
          {eligibleGames.map(g => (
            <option key={g.id} value={g.id} className="bg-zinc-900">
              {g.name} ({currentHours > 0 ? `${getTotalHours(g).toFixed(0)}h played` : 'not played'})
            </option>
          ))}
        </select>
      </div>

      {/* Hours slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-white/40">Additional hours to simulate</label>
          <span className="text-sm font-semibold text-purple-300">+{extraHours}h</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={extraHours}
          onChange={e => setExtraHours(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>5h</span><span>50h</span><span>100h</span>
        </div>
      </div>

      {/* Before / After comparison */}
      {result && selectedGame && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <CphCell label="Today" cph={currentCph} sub={`${currentHours.toFixed(0)}h played`} />
            <CphCell label={`After +${extraHours}h`} cph={result.after.value} sub={`${(currentHours + extraHours).toFixed(0)}h total`} />
          </div>

          {result.before.value !== result.after.value && (
            <div className="flex items-center justify-center gap-2 py-2">
              <DeltaBadge before={result.before.value} after={result.after.value} unit="$" lowerIsBetter />
            </div>
          )}

          {/* Milestone hints */}
          {hoursToTiers && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Value milestones</div>
              {[
                { tier: 'Excellent', hours: hoursToTiers.excellent, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { tier: 'Good', hours: hoursToTiers.good, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { tier: 'Fair', hours: hoursToTiers.fair, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              ].filter(m => m.hours > 0).map(m => (
                <div key={m.tier} className={clsx('flex items-center justify-between px-3 py-1.5 rounded-lg', m.bg)}>
                  <span className="text-xs text-white/50">Reach <span className={clsx('font-medium', m.color)}>{m.tier}</span> value</span>
                  <span className={clsx('text-xs font-semibold', m.color)}>+{m.hours.toFixed(0)}h needed</span>
                </div>
              ))}
              {hoursToTiers.excellent <= 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10">
                  <span className="text-xs text-emerald-400 font-medium">✓ Already at Excellent value!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="flex items-center gap-2 text-yellow-400/70 text-xs py-2">
          <AlertCircle size={12} />
          <span>Select a game to see the simulation</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScenarioSkipDuds({ games }: { games: Game[] }) {
  // Pre-selected: owned games with price > $10 and total hours < 2
  const candidates = useMemo(
    () => games.filter(g => g.status !== 'Wishlist' && g.price >= 10 && getTotalHours(g) < 2),
    [games],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map(g => g.id)));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const result = useMemo(() => whatIfNeverBought(games, [...selected]), [games, selected]);
  const selectedGames = candidates.filter(g => selected.has(g.id));
  const totalSaved = selectedGames.reduce((s, g) => s + g.price, 0);

  if (candidates.length === 0) {
    return (
      <div className="space-y-4">
        <ScenarioHeader
          label="Skip the Duds"
          icon={<Ban size={14} />}
          desc="Identify games you barely played and see what you'd save"
        />
        <div className="flex items-center gap-2 text-emerald-400/70 text-xs py-2">
          <span>✓ No obvious regret purchases — every game got decent play time!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScenarioHeader
        label="Skip the Duds"
        icon={<Ban size={14} />}
        desc="Games you paid $10+ for but barely played — toggle to see savings"
      />

      {/* Game checkboxes */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {candidates.map(g => {
          const hours = getTotalHours(g);
          const isSelected = selected.has(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={clsx(
                'w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left',
                isSelected
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-white/[0.03] border-white/5 opacity-50',
              )}
            >
              <div className={clsx(
                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                isSelected ? 'bg-red-500 border-red-500' : 'border-white/20',
              )}>
                {isSelected && <span className="text-[8px] text-white font-bold">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{g.name}</div>
                <div className="text-[10px] text-white/30">{hours.toFixed(1)}h played</div>
              </div>
              <div className={clsx('text-xs font-semibold shrink-0', isSelected ? 'text-red-400' : 'text-white/40')}>
                ${g.price.toFixed(0)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {selected.size > 0 && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50">You&apos;d have saved</span>
            <span className="text-lg font-bold text-emerald-400">{formatMoney(totalSaved)}</span>
          </div>
          <div className="text-[10px] text-white/30">
            {selected.size} game{selected.size !== 1 ? 's' : ''} skipped → {formatMoney(result.after.value)} total spent
          </div>
        </div>
      )}

      {selected.size === 0 && (
        <div className="text-[10px] text-white/30 text-center py-2">
          Select games above to see savings
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScenarioBacklog({ games }: { games: Game[] }) {
  const result = useMemo(() => whatIfCompletedBacklog(games), [games]);

  const backlog = useMemo(
    () => games.filter(g => g.status === 'Not Started' || (g.status === 'In Progress' && getTotalHours(g) < 10)),
    [games],
  );

  if (backlog.length === 0) {
    return (
      <div className="space-y-4">
        <ScenarioHeader
          label="Clear Your Backlog"
          icon={<Archive size={14} />}
          desc="See the value impact if you played everything you own"
        />
        <div className="flex items-center gap-2 text-emerald-400/70 text-xs py-2">
          <span>✓ No backlog detected — keep up the great work!</span>
        </div>
      </div>
    );
  }

  const cphBefore = result.before.value;
  const cphAfter = result.after.value;
  const estimatedHours = backlog.reduce((s, g) => s + Math.max(20 - getTotalHours(g), 0), 0);

  return (
    <div className="space-y-4">
      <ScenarioHeader
        label="Clear Your Backlog"
        icon={<Archive size={14} />}
        desc="What happens if you played through every game you own?"
      />

      <div className="p-3 bg-white/[0.04] rounded-xl space-y-2 text-xs text-white/50">
        <div className="flex justify-between">
          <span>Games in backlog</span>
          <span className="text-white font-medium">{backlog.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Estimated hours needed</span>
          <span className="text-white font-medium">{estimatedHours}h</span>
        </div>
        <div className="text-[10px] text-white/30">Estimate based on 20h per unstarted game</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CphCell label="Today's $/hr" cph={cphBefore} sub="current library" />
        <CphCell label="If cleared" cph={cphAfter} sub={`+${estimatedHours}h played`} />
      </div>

      {cphBefore > cphAfter && (
        <div className="flex items-center justify-center">
          <DeltaBadge before={cphBefore} after={cphAfter} unit="$" lowerIsBetter />
        </div>
      )}

      {/* Backlog list preview */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {backlog.slice(0, 8).map(g => (
          <div key={g.id} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.03] rounded-lg">
            <span className="text-xs text-white/60 truncate flex-1 mr-2">{g.name}</span>
            <span className="text-[10px] text-white/30 shrink-0">
              {g.status === 'Not Started' ? 'Unstarted' : `${getTotalHours(g).toFixed(0)}h`}
            </span>
          </div>
        ))}
        {backlog.length > 8 && (
          <div className="text-[10px] text-white/20 text-center py-1">+{backlog.length - 8} more</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScenarioPriceCap({ games }: { games: Game[] }) {
  const [maxPrice, setMaxPrice] = useState(40);

  const result = useMemo(() => whatIfPriceLimit(games, maxPrice), [games, maxPrice]);

  return (
    <div className="space-y-4">
      <ScenarioHeader
        label="Price Cap"
        icon={<Tag size={14} />}
        desc="What if you never paid more than a set amount per game?"
      />

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-white/40">Maximum price per game</label>
          <span className="text-sm font-semibold text-purple-300">${maxPrice}</span>
        </div>
        <input
          type="range"
          min={10}
          max={70}
          step={5}
          value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>$10</span><span>$40</span><span>$70</span>
        </div>
      </div>

      {result.removedGames.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-400/70 text-xs py-2">
          <span>✓ All your games are within the ${maxPrice} cap already!</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white/[0.04] rounded-xl">
              <div className="text-[10px] text-white/40 mb-1">You would have saved</div>
              <div className="text-xl font-bold text-emerald-400">{formatMoney(result.savedAmount)}</div>
              <div className="text-[10px] text-white/30 mt-0.5">
                {result.removedGames.length} game{result.removedGames.length !== 1 ? 's' : ''} excluded
              </div>
            </div>
            <div className="p-3 bg-white/[0.04] rounded-xl">
              <div className="text-[10px] text-white/40 mb-1">Hours lost</div>
              <div className="text-xl font-bold text-orange-400">{result.hoursLost.toFixed(0)}h</div>
              {result.avgRatingRemoved > 0 && (
                <div className="text-[10px] text-white/30 mt-0.5">avg {result.avgRatingRemoved.toFixed(1)}/10 rating</div>
              )}
            </div>
          </div>

          {/* CPH comparison */}
          {result.cphBefore > 0 && result.cphAfter > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <CphCell label="Actual $/hr" cph={result.cphBefore} />
              <CphCell label={`With $${maxPrice} cap`} cph={result.cphAfter} />
            </div>
          )}

          {/* Excluded games */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Games excluded</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {result.removedGames.slice(0, 8).map(g => (
                <div key={g.id} className="flex items-center justify-between px-2.5 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <span className="text-xs text-white/60 truncate flex-1 mr-2">{g.name}</span>
                  <span className="text-xs text-red-400 font-medium shrink-0">${g.price.toFixed(0)}</span>
                </div>
              ))}
              {result.removedGames.length > 8 && (
                <div className="text-[10px] text-white/20 text-center py-1">+{result.removedGames.length - 8} more</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScenarioRatingFilter({ games }: { games: Game[] }) {
  const [minRating, setMinRating] = useState(7);

  const result = useMemo(() => whatIfHighRatedOnly(games, minRating), [games, minRating]);

  return (
    <div className="space-y-4">
      <ScenarioHeader
        label="Only Keepers"
        icon={<Star size={14} />}
        desc="Retrospective: what if you only kept games you loved?"
      />

      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-white/40">Minimum rating to &quot;keep&quot;</label>
          <span className="text-sm font-semibold text-purple-300">{minRating}/10</span>
        </div>
        <input
          type="range"
          min={5}
          max={9}
          step={1}
          value={minRating}
          onChange={e => setMinRating(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>5</span><span>7</span><span>9</span>
        </div>
      </div>

      {result.removedGames.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-400/70 text-xs py-2">
          <span>✓ All your rated games are {minRating}+ — great taste!</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white/[0.04] rounded-xl">
              <div className="text-[10px] text-white/40 mb-1">Saved if skipped</div>
              <div className="text-xl font-bold text-emerald-400">{formatMoney(result.savedAmount)}</div>
              <div className="text-[10px] text-white/30 mt-0.5">
                {result.removedGames.length} game{result.removedGames.length !== 1 ? 's' : ''} below {minRating}/10
              </div>
            </div>
            <div className="p-3 bg-white/[0.04] rounded-xl">
              <div className="text-[10px] text-white/40 mb-1">Hours lost</div>
              <div className="text-xl font-bold text-orange-400">{result.hoursLost.toFixed(0)}h</div>
              <div className="text-[10px] text-white/30 mt-0.5">of gaming time</div>
            </div>
          </div>

          {/* Rating improvement */}
          {result.avgRatingBefore > 0 && result.avgRatingAfter > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/[0.04] rounded-xl">
                <div className="text-[10px] text-white/40 mb-1">Avg rating now</div>
                <div className="text-xl font-bold text-white">{result.avgRatingBefore.toFixed(1)}</div>
                <div className="text-[10px] text-white/30 mt-0.5">out of 10</div>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="text-[10px] text-white/40 mb-1">Rating if filtered</div>
                <div className="text-xl font-bold text-purple-300">{result.avgRatingAfter.toFixed(1)}</div>
                <div className="text-[10px] text-purple-400/60 mt-0.5">
                  +{(result.avgRatingAfter - result.avgRatingBefore).toFixed(1)} higher
                </div>
              </div>
            </div>
          )}

          {/* CPH comparison */}
          {result.cphBefore > 0 && result.cphAfter > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <CphCell label="Actual $/hr" cph={result.cphBefore} />
              <CphCell label={`${minRating}+ rated only`} cph={result.cphAfter} />
            </div>
          )}

          {/* Games that would be cut */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Games that didn&apos;t make the cut</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {result.removedGames.slice(0, 8).map(g => (
                <div key={g.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <span className="text-xs text-white/60 truncate flex-1">{g.name}</span>
                  <span className="text-[10px] text-yellow-400 shrink-0">{g.rating}/10</span>
                  <span className="text-[10px] text-white/30 shrink-0">${g.price.toFixed(0)}</span>
                </div>
              ))}
              {result.removedGames.length > 8 && (
                <div className="text-[10px] text-white/20 text-center py-1">+{result.removedGames.length - 8} more</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface WhatIfSimulatorProps {
  games: Game[];
}

const SCENARIOS: { id: ScenarioId; label: string; icon: React.ReactNode }[] = [
  { id: 'more-hours', label: 'Play More', icon: <Play size={12} /> },
  { id: 'skip-duds', label: 'Skip Duds', icon: <Ban size={12} /> },
  { id: 'backlog', label: 'Backlog', icon: <Archive size={12} /> },
  { id: 'price-cap', label: 'Price Cap', icon: <Tag size={12} /> },
  { id: 'rating-filter', label: 'Only Keepers', icon: <Star size={12} /> },
];

export function WhatIfSimulator({ games }: WhatIfSimulatorProps) {
  const [active, setActive] = useState<ScenarioId>('more-hours');
  const [collapsed, setCollapsed] = useState(false);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length < 3) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Wand2 size={15} className="text-violet-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">What If Simulator</div>
            <div className="text-xs text-white/40">Run alternate realities on your gaming history</div>
          </div>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-white/30" /> : <ChevronUp size={16} className="text-white/30" />}
      </button>

      {!collapsed && (
        <div className="border-t border-white/5">
          {/* Scenario tabs — horizontal scroll */}
          <div className="flex gap-1.5 p-3 overflow-x-auto border-b border-white/5 scrollbar-hide">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  active === s.id
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/[0.04] text-white/50 hover:text-white/70 border border-transparent',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Active scenario */}
          <div className="p-4">
            {active === 'more-hours' && <ScenarioMoreHours games={games} />}
            {active === 'skip-duds' && <ScenarioSkipDuds games={games} />}
            {active === 'backlog' && <ScenarioBacklog games={games} />}
            {active === 'price-cap' && <ScenarioPriceCap games={games} />}
            {active === 'rating-filter' && <ScenarioRatingFilter games={games} />}
          </div>
        </div>
      )}
    </div>
  );
}
