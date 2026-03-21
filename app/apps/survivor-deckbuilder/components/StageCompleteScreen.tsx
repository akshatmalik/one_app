'use client';

import { CombatResult, CardInstance, Encounter, StageLoot } from '../lib/types';
import { RunStatusBar } from './RunStatusBar';

interface StageCompleteScreenProps {
  stageNumber: number;
  totalStages: number;
  result: CombatResult;
  encounter: Encounter;
  survivors: CardInstance[];
  cardsRemaining: number;
  totalCards: number;
  isBarricaded?: boolean;
  loot?: StageLoot;
  onNextStage: () => void;
  isLastStage: boolean;
}

const MATERIAL_LABELS: Record<string, { icon: string; label: string }> = {
  scrapMetal:      { icon: '⚙', label: 'Scrap Metal' },
  wood:            { icon: '▤', label: 'Wood' },
  cloth:           { icon: '◫', label: 'Cloth' },
  medicalSupplies: { icon: '✚', label: 'Medical Supplies' },
};

export function StageCompleteScreen({
  stageNumber,
  totalStages,
  result,
  encounter,
  survivors,
  cardsRemaining,
  totalCards,
  isBarricaded,
  loot,
  onNextStage,
  isLastStage,
}: StageCompleteScreenProps) {
  const isVictory = result.result === 'player-victory';
  const hasMaterials = loot && Object.values(loot.materials).some(v => v > 0);

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

      <div className="flex-1 px-5 py-6 space-y-5 overflow-y-auto">
        {/* Stage result header */}
        <div>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-1">
            STAGE {stageNumber} OF {totalStages}
          </p>
          <h1 className={`text-3xl font-bold font-mono uppercase tracking-widest mb-1 ${
            isVictory ? 'text-stone-200' : 'text-red-800'
          }`}>
            {isVictory ? 'CLEARED' : 'FORCED OUT'}
          </h1>
          <p className="text-stone-600 text-sm font-mono">
            {encounter.name} — {isVictory ? 'secured' : 'too dangerous'}
          </p>
        </div>

        <div className="border-t border-stone-900" />

        {/* Quick combat stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-lg font-bold text-stone-300 font-mono">{result.damageDealt}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">DEALT</p>
          </div>
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className="text-lg font-bold text-stone-300 font-mono">{result.damageTaken}</p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">TAKEN</p>
          </div>
          <div className="border border-stone-800 bg-stone-900 p-3 text-center">
            <p className={`text-lg font-bold font-mono ${result.synergiesTriggered.length > 0 ? 'text-amber-700' : 'text-stone-600'}`}>
              {result.synergiesTriggered.length}
            </p>
            <p className="text-[8px] text-stone-700 font-mono tracking-widest uppercase mt-0.5">SYNERGY</p>
          </div>
        </div>

        {/* Survivor status */}
        <div>
          <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">TEAM STATUS</p>
          <div className="border border-stone-800 bg-stone-900">
            {survivors.map((s, i) => {
              const hp = s.currentHealth ?? 0;
              const maxHp = s.maxHealth ?? 100;
              const pct = (hp / maxHp) * 100;
              const dead = hp <= 0;
              return (
                <div key={s.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  <span className={`text-xs font-mono uppercase w-24 truncate ${dead ? 'text-stone-700' : 'text-stone-400'}`}>
                    {dead ? '✕ ' : ''}{s.name}
                  </span>
                  <div className="flex-1 h-0.5 bg-stone-800">
                    <div
                      className={`h-full ${dead ? 'w-0' : pct > 60 ? 'bg-stone-500' : pct > 30 ? 'bg-amber-800' : 'bg-red-900'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-stone-600 w-14 text-right">{hp}/{maxHp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loot — real items dropped */}
        {isVictory && loot && loot.items.length > 0 && (
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
              ITEMS FOUND
            </p>
            <div className="border border-stone-800 bg-stone-900">
              {loot.items.map((item, i) => (
                <div key={item.id} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-stone-800' : ''}`}>
                  <span className="text-xs text-stone-300 font-mono font-semibold">{item.name}</span>
                  <span className="text-[9px] text-stone-600 font-mono uppercase">
                    {item.itemType === 'consumable' ? '1× use' : item.maxAmmo ? `${item.maxAmmo} shots` : 'gear'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw materials */}
        {isVictory && hasMaterials && (
          <div>
            <p className="text-[9px] text-stone-700 font-mono tracking-widest uppercase mb-2">
              MATERIALS SALVAGED
            </p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(loot!.materials).map(([key, val]) => {
                if (val === 0) return null;
                const m = MATERIAL_LABELS[key];
                return (
                  <div key={key} className="border border-stone-800 bg-stone-900 px-3 py-2 flex items-center gap-2">
                    <span className="text-stone-600 text-xs">{m.icon}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{m.label}</span>
                    <span className="ml-auto text-xs font-mono font-bold text-stone-300">+{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards remaining note */}
        <div className="flex items-center justify-between border border-stone-900 px-3 py-2">
          <span className="text-[9px] text-stone-700 font-mono tracking-wider uppercase">Cards in deck</span>
          <span className="text-xs text-stone-600 font-mono">{cardsRemaining}</span>
        </div>
      </div>

      {/* Next action */}
      <div className="px-5 pb-8 pt-2">
        <button
          onClick={onNextStage}
          className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-sm tracking-widest uppercase border border-stone-700 transition-colors active:scale-[0.98]"
        >
          {isLastStage
            ? (isVictory ? 'RETURN TO BASE →' : 'FALL BACK →')
            : (isVictory ? `ADVANCE TO STAGE ${stageNumber + 1} →` : 'FALL BACK →')
          }
        </button>
      </div>
    </div>
  );
}
