import { CropId, GameState, PlayerAction } from '../types';

export interface OpeningObjective {
  title: string;
  instruction: string;
  target: number;
  reward: string;
}

export const OPENING_OBJECTIVES: OpeningObjective[] = [
  { title: 'Prepare the field', instruction: 'Till 3 open tiles', target: 3, reward: 'Potato seeds' },
  { title: 'Plant two crops', instruction: 'Plant wheat or potatoes', target: 3, reward: 'Carrot seeds' },
  { title: 'Care for the field', instruction: 'Water 3 planted tiles', target: 3, reward: '25 gold' },
  { title: 'Bring in the crop', instruction: 'Harvest 3 ready wheat tiles', target: 3, reward: 'Farm operations' },
  { title: 'Make the first sale', instruction: 'Sell wheat from the field crate', target: 1, reward: 'Carrots and seed trading' },
  { title: 'Grow the farm', instruction: 'Plant 6 more crops', target: 6, reward: 'Irrigation tools' },
  { title: 'Automate the routine', instruction: 'Build a supplied sprinkler', target: 1, reward: 'The full farm' },
];

const ACTION_FOR_STAGE: PlayerAction['type'][] = [
  'till',
  'plant',
  'water',
  'harvest',
  'exportWheatFromCrate',
  'plant',
  'buildSprinkler',
];

export function openingObjective(state: GameState): OpeningObjective | null {
  if (!state.opening || state.opening.complete) return null;
  return OPENING_OBJECTIVES[state.opening.stage] ?? null;
}

export function openingStage(state: GameState): number {
  return state.opening?.complete || !state.opening ? OPENING_OBJECTIVES.length : state.opening.stage;
}

export function availableCrops(state: GameState): CropId[] {
  if (!state.opening || state.opening.complete) return ['wheat', 'potato', 'beans', 'tomato', 'berries', 'pumpkin', 'rice', 'corn', 'carrot'];
  if (state.opening.stage >= 5) return ['wheat', 'potato', 'carrot', 'beans'];
  if (state.opening.stage >= 4) return ['wheat', 'potato', 'carrot'];
  return ['wheat', 'potato'];
}

export function operationsAvailable(state: GameState): boolean {
  return !state.opening || state.opening.complete || state.opening.stage >= 4;
}

export function irrigationAvailable(state: GameState): boolean {
  return !state.opening || state.opening.complete || state.opening.stage >= 6;
}

export function advanceOpening(state: GameState, action: PlayerAction): { state: GameState; completed?: OpeningObjective } {
  const opening = state.opening;
  if (!opening || opening.complete || ACTION_FOR_STAGE[opening.stage] !== action.type) return { state };

  const objective = OPENING_OBJECTIVES[opening.stage];
  const progress = opening.progress + 1;
  if (progress < objective.target) return { state: { ...state, opening: { ...opening, progress } } };

  const next: GameState = {
    ...state,
    seeds: { ...state.seeds },
    unlocks: [...state.unlocks],
    opening: {
      stage: opening.stage + 1,
      progress: 0,
      complete: opening.stage + 1 >= OPENING_OBJECTIVES.length,
    },
  };

  if (opening.stage === 0) next.seeds.potato += 4;
  if (opening.stage === 1) next.seeds.carrot += 4;
  if (opening.stage === 2) next.gold += 25;
  if (opening.stage === 4) next.seeds.carrot += 4;
  if (opening.stage === 5 && !next.unlocks.includes('irrigation')) next.unlocks.push('irrigation');

  return { state: next, completed: objective };
}
