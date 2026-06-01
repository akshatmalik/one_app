'use client';

import { useState, useMemo } from 'react';
import { Shuffle, ChevronDown, ChevronUp, Sparkles, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { Game } from '../lib/types';
import { getWhatIfSimulatorData, WhatIfSimulatorScenario } from '../lib/calculations';
import clsx from 'clsx';

interface WhatIfSimulatorProps {
  games: Game[];
}

const SCENARIO_COLORS: Record<string, { border: string; bg: string; accent: string; pill: string }> = {
  impulse:   { border: 'border-amber-500/20',  bg: 'from-amber-500/10 to-orange-500/5',  accent: 'text-amber-400',   pill: 'bg-amber-500/15 text-amber-300' },
  abandoned: { border: 'border-red-500/20',    bg: 'from-red-500/10 to-rose-500/5',      accent: 'text-red-400',     pill: 'bg-red-500/15 text-red-300' },
  backlog:   { border: 'border-violet-500/20', bg: 'from-violet-500/10 to-purple-500/5', accent: 'text-violet-400',  pill: 'bg-violet-500/15 text-violet-300' },
  fullprice: { border: 'border-emerald-500/20',bg: 'from-emerald-500/10 to-green-500/5', accent: 'text-emerald-400', pill: 'bg-emerald-500/15 text-emerald-300' },
};

const SEVERITY_BADGE: Record<WhatIfSimulatorScenario['severity'], { label: string; color: string }> = {
  high:   { label: 'High impact',   color: 'text-red-400 bg-red-500/10 border border-red-500/20' },
  medium: { label: 'Medium impact', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
  low:    { label: 'Low impact',    color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
};

function ScenarioCard({ scenario, isOpen, onToggle }: {
  scenario: WhatIfSimulatorScenario;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const colors = SCENARIO_COLORS[scenario.id] || SCENARIO_COLORS.impulse;
  const severity = SEVERITY_BADGE[scenario.severity];

  return (
    <div className={clsx('rounded-xl border transition-all overflow-hidden', colors.border)}>
      {/* Header row — always visible */}
      <button
        onClick={onToggle}
        className={clsx(
          'w-full p-4 text-left bg-gradient-to-br transition-all',
          colors.bg,
          isOpen ? 'rounded-t-xl rounded-b-none' : 'rounded-xl hover:brightness-110'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Emoji */}
          <span className="text-2xl leading-none mt-0.5 shrink-0">{scenario.emoji}</span>

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{scenario.title}</span>
              <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', severity.color)}>
                {severity.label}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5 leading-snug">{scenario.subtitle}</p>
          </div>

          {/* Primary metric */}
          <div className="text-right shrink-0 ml-1">
            <div className={clsx('text-lg font-black', scenario.primaryPositive ? 'text-emerald-400' : colors.accent)}>
              {scenario.primaryValue}
            </div>
            <div className="text-[9px] text-white/30 leading-tight max-w-[80px] text-right">
              {scenario.primaryLabel}
            </div>
          </div>

          {/* Chevron */}
          <div className="shrink-0 self-center ml-1">
            {isOpen
              ? <ChevronUp size={16} className="text-white/30" />
              : <ChevronDown size={16} className="text-white/30" />
            }
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-[#0e0e16] border-t border-white/5">

          {/* Before / After stats */}
          <div className="space-y-2">
            {scenario.stats.map((stat, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <span className="text-white/40 shrink-0">{stat.label}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-white/30 truncate">{stat.before}</span>
                  <span className="text-white/15 shrink-0">→</span>
                  <span className={clsx(
                    'font-semibold truncate',
                    stat.betterAfter ? 'text-emerald-400' : 'text-red-400/80'
                  )}>
                    {stat.after}
                    {stat.betterAfter
                      ? <TrendingDown size={10} className="inline ml-1 mb-0.5" />
                      : <TrendingUp size={10} className="inline ml-1 mb-0.5" />
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Insight / takeaway */}
          <div className={clsx('p-3 rounded-lg border', colors.border, `bg-gradient-to-r ${colors.bg}`)}>
            <p className="text-xs text-white/60 italic leading-relaxed">
              &ldquo;{scenario.takeaway}&rdquo;
            </p>
          </div>

          {/* Affected games */}
          {scenario.affectedGames.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle size={11} className="text-white/25" />
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  Affected Games ({scenario.affectedGames.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {scenario.affectedGames.map(({ game, note }) => (
                  <div key={game.id} className="flex items-center gap-2.5 px-2.5 py-2 bg-white/[0.03] rounded-lg border border-white/5">
                    {game.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="w-8 h-8 object-cover rounded shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-white/10 shrink-0 flex items-center justify-center text-sm">
                        🎮
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/75 truncate font-medium">{game.name}</div>
                      <div className="text-[10px] text-white/30 truncate">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!scenario.hasImpact && (
            <div className="flex items-center gap-2 text-xs text-emerald-400/70">
              <Sparkles size={13} />
              <span>No issues here — you&apos;re doing great on this front.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WhatIfSimulator({ games }: WhatIfSimulatorProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const scenarios = useMemo(() => getWhatIfSimulatorData(games), [games]);

  const ownedGames = games.filter(g => g.status !== 'Wishlist' && !g.acquiredFree);
  if (ownedGames.length < 3) return null;

  // Summary stat: total alternate-reality impact
  const totalImpact = scenarios
    .filter(s => s.id !== 'fullprice') // fullprice is positive, keep separate
    .reduce((sum, s) => {
      const val = parseFloat(s.primaryValue.replace(/[$h]/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const highCount = scenarios.filter(s => s.severity === 'high').length;

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <Shuffle size={14} className="text-violet-400" />
          Alternate Reality Simulator
        </h3>
        {highCount > 0 && (
          <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
            {highCount} high-impact area{highCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <p className="text-xs text-white/30 leading-relaxed">
        What would your library look like with different choices? Tap each scenario to explore.
      </p>

      {/* Scenario cards */}
      <div className="space-y-2">
        {scenarios.map(scenario => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isOpen={openId === scenario.id}
            onToggle={() => toggle(scenario.id)}
          />
        ))}
      </div>

      {/* Footer nudge */}
      {highCount === 0 && ownedGames.length >= 5 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs text-emerald-400/70">
          <Sparkles size={13} className="shrink-0" />
          <span>No high-impact scenarios detected — your spending habits look healthy.</span>
        </div>
      )}
    </div>
  );
}
