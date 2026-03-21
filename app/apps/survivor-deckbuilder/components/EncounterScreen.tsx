'use client';

import { useState, useEffect } from 'react';
import { Encounter, CardInstance } from '../lib/types';
import { RunStatusBar } from './RunStatusBar';

interface EncounterScreenProps {
  encounter: Encounter;
  stageNumber: number;
  totalStages: number;
  survivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  onEnterCombat: () => void;
}

const LOCATION_SCENES: Record<string, { emoji: string; mood: string; arrivalText: string }> = {
  'Abandoned Pharmacy': {
    emoji: '🏥',
    mood: 'The air smells of antiseptic and decay.',
    arrivalText: 'You approach the pharmacy. The front door hangs off its hinges.',
  },
  'Highway Gas Station': {
    emoji: '⛽',
    mood: 'Heat shimmers off the asphalt. Something moves inside.',
    arrivalText: 'The gas station sits alone on the highway. Looks quiet — too quiet.',
  },
  'Elementary School': {
    emoji: '🏫',
    mood: 'Tiny desks overturned. Crayon drawings on the walls.',
    arrivalText: 'The school cafeteria. There could be food inside.',
  },
  'Military Warehouse': {
    emoji: '🏭',
    mood: 'Concrete walls. Chain-link fencing. Something valuable inside.',
    arrivalText: 'A military supply depot. The lock is broken.',
  },
  'City Hospital': {
    emoji: '🏨',
    mood: 'Monitors still beeping in the dark. The infected roam the halls.',
    arrivalText: 'The east wing. Quarantine ground zero.',
  },
  'Police Station': {
    emoji: '🚔',
    mood: 'Sirens long dead. The armory door is reinforced glass.',
    arrivalText: 'The police station. The armory could change everything.',
  },
  'Subway Tunnel': {
    emoji: '🚇',
    mood: 'Total darkness. The sound of skittering echoes.',
    arrivalText: 'Down into the tunnels. The nest is here somewhere.',
  },
  'River Bridge': {
    emoji: '🌉',
    mood: 'The bridge groans under its own weight. No other way across.',
    arrivalText: 'The only bridge back. Something massive blocks the way.',
  },
  'Research Laboratory': {
    emoji: '🔬',
    mood: 'Emergency lights pulse red. Containment has failed.',
    arrivalText: 'The lab still has power. The subjects have escaped.',
  },
};

function getLocationBackground(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes('pharmacy') || loc.includes('hospital')) return 'bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950';
  if (loc.includes('gas') || loc.includes('highway')) return 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950';
  if (loc.includes('school')) return 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950';
  if (loc.includes('warehouse') || loc.includes('military')) return 'bg-gradient-to-b from-green-950/60 via-slate-900 to-slate-950';
  if (loc.includes('police')) return 'bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950';
  if (loc.includes('subway') || loc.includes('tunnel')) return 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950';
  if (loc.includes('bridge') || loc.includes('river')) return 'bg-gradient-to-b from-cyan-950/50 via-slate-900 to-slate-950';
  if (loc.includes('lab') || loc.includes('research')) return 'bg-gradient-to-b from-violet-950/60 via-slate-900 to-slate-950';
  return 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950';
}

export function EncounterScreen({
  encounter,
  stageNumber,
  totalStages,
  survivors,
  cardsRemaining,
  totalCards,
  onEnterCombat,
}: EncounterScreenProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const scene = LOCATION_SCENES[encounter.location ?? ''] ?? {
    emoji: '📍',
    mood: 'An unknown place. Stay alert.',
    arrivalText: 'You arrive at your destination.',
  };

  const totalHP = (encounter.enemies ?? []).reduce((sum, e) => sum + e.health, 0);
  const bg = getLocationBackground(encounter.location ?? '');

  const diffColor = {
    easy: 'text-green-400 bg-green-400/10 border-green-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    hard: 'text-red-400 bg-red-400/10 border-red-400/20',
    very_hard: 'text-red-500 bg-red-500/10 border-red-500/20',
  }[encounter.difficulty ?? 'easy'];

  return (
    <div className={`min-h-screen flex flex-col ${bg} transition-all duration-1000`}>
      {/* Status bar */}
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={survivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
      />

      {/* Arrival scene */}
      <div className="flex-1 px-5 py-6 flex flex-col">
        {/* Location arrival */}
        <div className={`transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Big location emoji */}
          <div className="text-center mb-6">
            <span className="text-6xl">{scene.emoji}</span>
          </div>

          {/* Arrival text — narrative */}
          <p className="text-white/50 text-sm italic text-center mb-1">
            {scene.arrivalText}
          </p>
          <p className="text-white/30 text-xs italic text-center mb-6">
            {scene.mood}
          </p>

          {/* Encounter name */}
          <h1 className="text-2xl font-bold text-white text-center mb-1">
            {encounter.name}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`text-[10px] px-3 py-1 rounded-full border font-semibold ${diffColor}`}>
              {(encounter.difficulty ?? 'easy').toUpperCase()}
            </span>
            <span className="text-[10px] text-white/30">·</span>
            <span className="text-[10px] text-white/40 font-mono">
              {(encounter.enemies ?? []).length} hostiles · {totalHP} HP
            </span>
          </div>
        </div>

        {/* Encounter description */}
        <div className={`transition-all duration-700 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/5 p-5 mb-4">
            <p className="text-white/70 text-sm leading-relaxed">
              {encounter.description}
            </p>
          </div>
        </div>

        {/* Enemy cards */}
        <div className={`transition-all duration-700 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[10px] text-red-400/60 uppercase tracking-wider font-semibold mb-2 px-1">
            Threats
          </p>
          <div className="space-y-2">
            {(encounter.enemies ?? []).map((enemy, i) => (
              <div
                key={i}
                className="bg-red-950/30 backdrop-blur-sm rounded-xl border border-red-500/10 px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💀</span>
                  <div>
                    <p className="font-semibold text-sm text-white/80">{enemy.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-orange-400 font-mono">ATK {enemy.damage}</span>
                      {enemy.defense > 0 && (
                        <span className="text-[10px] text-blue-400 font-mono">DEF {enemy.defense}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full w-full" />
                  </div>
                  <span className="text-xs font-mono text-red-400">{enemy.health}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reward hint */}
        {encounter.rewardsText && (
          <div className={`mt-4 transition-all duration-700 delay-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2">
              <p className="text-[11px] text-amber-400/70">
                ◆ Reward: {encounter.rewardsText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Enter combat button */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onEnterCombat}
          className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold text-lg rounded-2xl transition-all active:scale-[0.97] shadow-lg shadow-red-900/30"
        >
          Choose Cards
        </button>
        <p className="text-center text-[10px] text-white/20 mt-2">
          {cardsRemaining} card{cardsRemaining !== 1 ? 's' : ''} remaining &mdash; choose wisely
        </p>
      </div>
    </div>
  );
}
