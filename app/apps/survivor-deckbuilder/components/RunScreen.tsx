'use client';

import { useState, useEffect, useRef } from 'react';
import { Run, CardInstance, CombatCombo } from '../lib/types';
import { EncounterScreen } from './EncounterScreen';
import { HandScreen } from './HandScreen';
import { CombatResolutionScreen } from './CombatResolutionScreen';
import { StageCompleteScreen } from './StageCompleteScreen';
import { RunCompleteScreen } from './RunCompleteScreen';
import { ENEMY_TYPE_DEFS } from '../lib/registry';
import { detectCombos } from '../lib/combat-engine';

interface RunScreenProps {
  run: Run;
  onEnterCombat: () => void;
  onPlayCards: (cards: CardInstance[]) => void;
  onContinueAfterCombat: () => void;
  onAdvanceStage: () => void;
  onCompleteRun: () => void;
  onRetreat: () => void;
}

export function RunScreen({
  run,
  onEnterCombat,
  onPlayCards,
  onContinueAfterCombat,
  onAdvanceStage,
  onCompleteRun,
  onRetreat,
}: RunScreenProps) {
  // ── Telegraph state ──────────────────────────────────────────────────
  // Flash enemy type icon for 1.5s when stage_start phase loads
  const [telegraphDone, setTelegraphDone] = useState(false);
  const telegraphKeyRef = useRef('');

  useEffect(() => {
    if (run.phase === 'stage_start' && run.currentEncounter) {
      const key = `${run.currentStage}-${run.currentEncounter.id}`;
      if (telegraphKeyRef.current !== key) {
        telegraphKeyRef.current = key;
        setTelegraphDone(false);
        const t = setTimeout(() => setTelegraphDone(true), 1500);
        return () => clearTimeout(t);
      }
    }
  }, [run.phase, run.currentStage, run.currentEncounter]);

  // ── Combo flash state ────────────────────────────────────────────────
  // Intercept onPlayCards → show combo banner for 1.5s → then submit
  const [combosFlashing, setCombosFlashing] = useState<CombatCombo[]>([]);
  const pendingCardsRef = useRef<CardInstance[] | null>(null);

  const handlePlayCards = (cards: CardInstance[]) => {
    const combos = detectCombos(cards);
    if (combos.length > 0) {
      pendingCardsRef.current = cards;
      setCombosFlashing(combos);
      setTimeout(() => {
        setCombosFlashing([]);
        if (pendingCardsRef.current) {
          onPlayCards(pendingCardsRef.current);
          pendingCardsRef.current = null;
        }
      }, 1500);
    } else {
      onPlayCards(cards);
    }
  };

  // ── Cards remaining ──────────────────────────────────────────────────
  const cardsRemaining = run.deck.filter(c => {
    if (c.type === 'survivor') {
      const live = run.activeSurvivors.find(s => s.id === c.id);
      return (live?.currentHealth ?? c.currentHealth ?? 0) > 0;
    }
    if (c.itemType === 'equipment') {
      if (c.maxAmmo !== undefined) return (run.weaponAmmo[c.id] ?? 0) > 0;
      return true;
    }
    return !run.consumedCardIds.includes(c.id);
  }).length;
  const totalCards = run.deck.length;

  // ── Combo flash overlay ──────────────────────────────────────────────
  if (combosFlashing.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          {combosFlashing.map((combo, i) => (
            <div
              key={combo.id ?? i}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-yellow-400/60 bg-yellow-900/30"
            >
              <span className="text-3xl">{combo.icon}</span>
              <div className="flex flex-col">
                <span className="text-yellow-300 text-xl font-bold tracking-widest">{combo.label}</span>
                <span className="text-yellow-500/80 text-sm">
                  {combo.dmgBonus > 0 && `+${combo.dmgBonus} DMG  `}
                  {combo.hlgBonus > 0 && `+${combo.hlgBonus} HLG  `}
                  {combo.defBonus > 0 && `+${combo.defBonus} DEF`}
                </span>
              </div>
            </div>
          ))}
          <p className="text-yellow-600/60 text-sm mt-2 tracking-widest">COMBO ACTIVATED</p>
        </div>
      </div>
    );
  }

  switch (run.phase) {
    case 'stage_start': {
      if (!run.currentEncounter) return null;

      // Enemy type telegraph — flash for 1.5s before showing full encounter screen
      const enemyType = run.currentEncounter.enemyType;
      const typeDef = enemyType ? ENEMY_TYPE_DEFS[enemyType] : null;

      if (!telegraphDone && typeDef) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <span className="text-6xl">{typeDef.icon}</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-red-400 text-2xl font-bold tracking-widest uppercase">{typeDef.label}</span>
                <span className="text-gray-500 text-sm">{typeDef.description}</span>
              </div>
              {typeDef.weaknesses.length > 0 && (
                <div className="text-xs text-amber-500/70 border border-amber-900/40 px-3 py-1 rounded-full">
                  Weak to: {typeDef.weaknesses.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      }

      return (
        <EncounterScreen
          encounter={run.currentEncounter}
          stageNumber={run.currentStage}
          totalStages={run.totalStages}
          survivors={run.activeSurvivors}
          cardsRemaining={cardsRemaining}
          totalCards={totalCards}
          isBarricaded={run.isBarricaded}
          onEnterCombat={onEnterCombat}
          onRetreat={onRetreat}
        />
      );
    }

    case 'card_selection':
      if (!run.currentEncounter) return null;
      return (
        <HandScreen
          hand={run.currentHand}
          encounter={run.currentEncounter}
          activeSurvivors={run.activeSurvivors}
          cardsRemaining={cardsRemaining}
          totalCards={totalCards}
          stageNumber={run.currentStage}
          totalStages={run.totalStages}
          isBarricaded={run.isBarricaded}
          onPlayCards={handlePlayCards}
        />
      );

    case 'combat_resolution':
      if (!run.lastCombatResult || !run.currentEncounter) return null;
      return (
        <CombatResolutionScreen
          result={run.lastCombatResult}
          cardsPlayed={run.currentHand}
          encounter={run.currentEncounter}
          survivors={run.activeSurvivors}
          stageNumber={run.currentStage}
          totalStages={run.totalStages}
          cardsRemaining={cardsRemaining}
          totalCards={totalCards}
          isBarricaded={run.isBarricaded}
          onContinue={onContinueAfterCombat}
        />
      );

    case 'stage_complete':
      if (!run.lastCombatResult || !run.currentEncounter) return null;
      return (
        <StageCompleteScreen
          stageNumber={run.currentStage}
          totalStages={run.totalStages}
          result={run.lastCombatResult}
          encounter={run.currentEncounter}
          survivors={run.activeSurvivors}
          cardsRemaining={cardsRemaining}
          totalCards={totalCards}
          isBarricaded={run.isBarricaded}
          loot={run.stagedLoot[run.currentStage]}
          onNextStage={
            run.currentStage >= run.totalStages
              ? onCompleteRun
              : onAdvanceStage
          }
              isLastStage={run.currentStage >= run.totalStages}
        />
      );

    case 'run_complete':
      return (
        <RunCompleteScreen run={run} isSuccess={true} onReturnHome={onCompleteRun} />
      );

    case 'run_failed':
      return (
        <RunCompleteScreen run={run} isSuccess={false} onReturnHome={onCompleteRun} />
      );

    default:
      return null;
  }
}
