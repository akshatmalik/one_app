'use client';

import { useState } from 'react';
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

const APPROACH_LINES: Record<string, string> = {
  'Abandoned Pharmacy': 'The front door hangs off its hinges. Broken glass on the floor. The medicine cabinet is just past them.',
  'Highway Gas Station': 'Heat off the asphalt. Flies circling a window. Something moving inside.',
  'Elementary School': 'Tiny shoes still in the hallway. Crayon drawings on the walls. The cafeteria door is stuck.',
  'Military Warehouse': 'Razor wire. Broken padlock. Whatever\'s inside, someone wanted it protected.',
  'City Hospital': 'Emergency lights pulse red. The quarantine tape is shredded.',
  'Police Station': 'Armory door is reinforced glass. Two dead officers still wear their kevlar.',
  'Subway Tunnel': 'Total darkness below. The sound of skittering echoes up the stairs.',
  'River Bridge': 'No other way across. The bridge groans. Something massive waits at the midspan.',
  'Research Laboratory': 'The containment seals are blown. Something got out.',
};

const LOCATION_ICON: Record<string, string> = {
  'Abandoned Pharmacy': '💊',
  'Highway Gas Station': '⛽',
  'Elementary School': '🏫',
  'Military Warehouse': '🏭',
  'City Hospital': '🏥',
  'Police Station': '🚔',
  'Subway Tunnel': '🚇',
  'River Bridge': '🌉',
  'Research Laboratory': '🔬',
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
  const [phase, setPhase] = useState<'story' | 'threat'>('story');

  const approachLine = APPROACH_LINES[encounter.location ?? ''] ?? 'Unknown ground. Stay sharp.';
  const locationIcon = LOCATION_ICON[encounter.location ?? ''] ?? '📍';
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
    very_hard: 'text-red-500',
  }[encounter.difficulty ?? 'easy'];

  // Phase 1: Story / atmospheric reveal
  if (phase === 'story') {
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

        <div className="flex-1 flex flex-col px-5 pt-8 pb-6">
          {/* Stage label */}
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-6">
            STAGE {stageNumber} OF {totalStages}
          </p>

          {/* Location icon — large, atmospheric */}
          <div className="flex justify-center mb-5">
            <span className="text-6xl opacity-40">{locationIcon}</span>
          </div>

          {/* Location name */}
          <h1 className="text-2xl font-bold text-stone-200 uppercase tracking-wide text-center mb-2">
            {encounter.name}
          </h1>

          {/* Approach line — single evocative sentence */}
          <div className="border-l-2 border-stone-800 pl-4 mb-4">
            <p className="text-stone-400 text-sm leading-relaxed italic">
              {approachLine}
            </p>
          </div>

          {/* Encounter description */}
          <p className="text-stone-500 text-sm leading-relaxed">
            {encounter.description}
          </p>

          <div className="flex-1" />
        </div>

        {/* Single CTA — move to threat screen */}
        <div className="px-5 pb-8 space-y-2">
          <button
            onClick={() => setPhase('threat')}
            className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
          >
            APPROACH →
          </button>
          <button
            onClick={onRetreat}
            className="w-full py-2.5 text-stone-700 hover:text-stone-600 font-mono text-xs tracking-widest uppercase border border-stone-900 transition-colors"
          >
            FALL BACK
          </button>
        </div>
      </div>
    );
  }

  // Phase 2: Threats visible — decide to advance or retreat
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

      <div className="flex-1 px-5 pt-5 pb-2 flex flex-col">
        {/* Location + difficulty */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-300 uppercase tracking-wide">
              {encounter.name}
            </h2>
            <p className={`text-[10px] font-mono tracking-widest ${diffColor}`}>
              {diffLabel}
            </p>
          </div>
          <span className="text-3xl opacity-30">{locationIcon}</span>
        </div>

        {/* Threats — visual cards */}
        <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
          THREATS · {totalHP} HP TOTAL
        </p>
        <div className="space-y-1.5 mb-4">
          {(encounter.enemies ?? []).map((enemy, i) => {
            const hpFill = (enemy.health / enemy.maxHealth) * 100;
            return (
              <div
                key={i}
                className="border border-stone-800 bg-stone-900 px-3 py-2.5 rounded"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-stone-300 font-mono font-bold">{enemy.name}</span>
                  <div className="flex gap-2 text-[10px] font-mono">
                    <span className="text-red-700">ATK {enemy.damage}</span>
                    {enemy.defense > 0 && (
                      <span className="text-stone-600">DEF {enemy.defense}</span>
                    )}
                  </div>
                </div>
                {/* HP as dots + bar */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(enemy.health, 8) }).map((_, j) => (
                      <span key={j} className="text-[8px] text-red-900">●</span>
                    ))}
                    {enemy.health > 8 && (
                      <span className="text-[8px] text-red-900 font-mono">+{enemy.health - 8}</span>
                    )}
                  </div>
                  <div className="flex-1 h-0.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-900 rounded-full"
                      style={{ width: `${hpFill}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-stone-700 font-mono w-8 text-right">
                    {enemy.health}hp
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loot hint — subtle */}
        <div className="border border-stone-900 px-3 py-2 rounded">
          <p className="text-[9px] text-stone-700 font-mono">
            {stageNumber === 1 && 'Basic supplies if cleared.'}
            {stageNumber === 2 && 'Equipment cache if cleared.'}
            {stageNumber === 3 && 'Rare military-grade find.'}
          </p>
        </div>

        <div className="flex-1" />
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 pt-2 space-y-2">
        <button
          onClick={onEnterCombat}
          className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
        >
          ADVANCE →
        </button>
        <button
          onClick={onRetreat}
          className="w-full py-2.5 text-stone-700 hover:text-stone-600 font-mono text-xs tracking-widest uppercase border border-stone-900 transition-colors"
        >
          FALL BACK
        </button>
      </div>
    </div>
  );
}
