'use client';

import { Run, CardInstance } from '../lib/types';
import { EncounterScreen } from './EncounterScreen';
import { HandScreen } from './HandScreen';
import { CombatResolutionScreen } from './CombatResolutionScreen';
import { StageCompleteScreen } from './StageCompleteScreen';
import { RunCompleteScreen } from './RunCompleteScreen';

interface RunScreenProps {
  run: Run;
  onEnterCombat: () => void;
  onPlayCards: (cards: CardInstance[]) => void;
  onContinueAfterCombat: () => void;
  onAdvanceStage: () => void;
  onCompleteRun: () => void;
}

export function RunScreen({
  run,
  onEnterCombat,
  onPlayCards,
  onContinueAfterCombat,
  onAdvanceStage,
  onCompleteRun,
}: RunScreenProps) {
  const cardsRemaining = run.deck.length - run.playedCardsThisRun.length;
  const totalCards = run.deck.length;

  switch (run.phase) {
    case 'stage_start':
      if (!run.currentEncounter) return null;
      return (
        <EncounterScreen
          encounter={run.currentEncounter}
          stageNumber={run.currentStage}
          totalStages={run.totalStages}
          survivors={run.activeSurvivors}
          cardsRemaining={cardsRemaining}
          totalCards={totalCards}
          onEnterCombat={onEnterCombat}
        />
      );

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
          onPlayCards={onPlayCards}
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
