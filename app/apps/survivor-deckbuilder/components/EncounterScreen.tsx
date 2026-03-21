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
  isBarricaded?: boolean;
  onEnterCombat: () => void;
  onRetreat: () => void;
}

const STAGE_LOOT: Record<number, string> = {
  1: 'Basic supplies — food, bandages, spare ammo.',
  2: 'Equipment cache — building materials, tactical gear.',
  3: 'Rare find — military-grade weapons and med kits.',
};

const APPROACH_LINES: Record<string, string> = {
  'Abandoned Pharmacy': 'The front door hangs off its hinges. Broken glass. The medicine cabinet is just past them.',
  'Highway Gas Station': 'Heat off the asphalt. Flies circling a window. Something moving inside.',
  'Elementary School': 'Tiny shoes in the hallway. Crayon drawings on the walls. The cafeteria door is stuck.',
  'Military Warehouse': 'Razor wire. Broken padlock. Whatever\'s inside, someone wanted it protected.',
  'City Hospital': 'Emergency lights pulse red. The quarantine tape is shredded.',
  'Police Station': 'Armory door is reinforced glass. Two dead officers still wear their kevlar.',
  'Subway Tunnel': 'Total darkness below. The sound of skittering echoes up the stairs.',
  'River Bridge': 'No other way across. The bridge groans. Something massive waits at the midspan.',
  'Research Laboratory': 'The containment seals are blown. Something got out.',
};

export function EncounterScreen({
  encounter,
  stageNumber,
  totalStages,
  survivors,
  cardsRemaining,
  totalCards,
  isBarricaded,
  onEnterCombat,
  onRetreat,
}: EncounterScreenProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const approachLine = APPROACH_LINES[encounter.location ?? ''] ?? 'Unknown ground. Stay sharp.';
  const stageLoot = STAGE_LOOT[stageNumber] ?? '';
  const totalHP = (encounter.enemies ?? []).reduce((sum, e) => sum + e.health, 0);

  const diffLabel = {
    easy: 'LOW THREAT',
    medium: 'MODERATE',
    hard: 'DANGER',
    very_hard: 'CRITICAL',
  }[encounter.difficulty ?? 'easy'];

  const diffColor = {
    easy: 'text-stone-500',
    medium: 'text-amber-700',
    hard: 'text-red-700',
    very_hard: 'text-red-600',
  }[encounter.difficulty ?? 'easy'];

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-300">
      <RunStatusBar
        stageNumber={stageNumber}
        totalStages={totalStages}
        survivors={survivors}
        cardsRemaining={cardsRemaining}
        totalCards={totalCards}
        location={encounter.location}
        isBarricaded={isBarricaded}
      />

      <div className="flex-1 px-5 py-6 flex flex-col">
        {/* Stage context */}
        <div className={`transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-4">
            ── STAGE {stageNumber} OF {totalStages} ──────────────────
          </p>

          {/* Location name */}
          <h1 className="text-2xl font-bold text-stone-200 uppercase tracking-wide mb-1">
            {encounter.name}
          </h1>
          <div className="flex items-center gap-3 mb-5">
            <span className={`text-[10px] font-mono tracking-widest ${diffColor}`}>
              {diffLabel}
            </span>
            <span className="text-stone-700 text-[10px]">·</span>
            <span className="text-[10px] text-stone-600 font-mono">
              {(encounter.enemies ?? []).length} HOSTILES · {totalHP} HP TOTAL
            </span>
          </div>

          {/* Approach description */}
          <div className="border-l-2 border-stone-800 pl-4 mb-5">
            <p className="text-stone-500 text-sm leading-relaxed italic">
              {approachLine}
            </p>
          </div>

          {/* Encounter description */}
          <p className="text-stone-400 text-sm leading-relaxed mb-6">
            {encounter.description}
          </p>
        </div>

        {/* Threats */}
        <div className={`transition-opacity duration-500 delay-200 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
            THREATS
          </p>
          <div className="space-y-1 mb-5">
            {(encounter.enemies ?? []).map((enemy, i) => (
              <div
                key={i}
                className="flex items-center justify-between border border-stone-800 bg-stone-900 px-3 py-2"
              >
                <span className="text-sm text-stone-400 font-mono">{enemy.name}</span>
                <div className="flex gap-3 text-[10px] font-mono">
                  <span className="text-red-800">ATK {enemy.damage}</span>
                  {enemy.defense > 0 && (
                    <span className="text-stone-600">DEF {enemy.defense}</span>
                  )}
                  <span className="text-stone-500">HP {enemy.health}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loot hint */}
        <div className={`transition-opacity duration-500 delay-300 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
          {stageLoot && (
            <div className="border border-stone-800 px-3 py-2 mb-6">
              <p className="text-[10px] text-stone-600 font-mono tracking-wider uppercase mb-0.5">
                IF SECURED
              </p>
              <p className="text-[11px] text-amber-800">{stageLoot}</p>
            </div>
          )}
        </div>

        <div className="flex-1" />
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-8 pt-2 space-y-2">
        <button
          onClick={onEnterCombat}
          className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
        >
          ADVANCE →
        </button>
        <button
          onClick={onRetreat}
          className="w-full py-2.5 bg-transparent hover:bg-stone-900 text-stone-600 hover:text-stone-500 font-mono text-xs tracking-widest uppercase border border-stone-800 transition-colors"
        >
          FALL BACK (RETREAT)
        </button>
      </div>
    </div>
  );
}
