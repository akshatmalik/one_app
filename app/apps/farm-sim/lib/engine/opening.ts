import { CropId, GameState, PlayerAction } from '../types';
import { activeCrops, cultivatedTiles } from './toolProgression';

export interface OpeningObjective {
  title: string;
  instruction: string;
  target: number;
  reward: string;
}

export const OPENING_OBJECTIVES: OpeningObjective[] = [
  { title: 'Prepare the field', instruction: 'Till 3 open tiles', target: 3, reward: 'Potato seeds' },
  { title: 'Plant two crops', instruction: 'Plant wheat or potatoes', target: 3, reward: 'More starter seeds' },
  { title: 'Care for the field', instruction: 'Water 3 planted tiles', target: 3, reward: '25 gold' },
  { title: 'Bring in the crop', instruction: 'Harvest your first ready wheat', target: 1, reward: 'Farm operations' },
  { title: 'Make the first sale', instruction: 'Sell wheat from your inventory', target: 1, reward: 'Carrots and an open farm' },
];

const ACTION_FOR_STAGE: PlayerAction['type'][] = [
  'till',
  'plant',
  'water',
  'harvest',
  'sell',
];

export function openingObjective(state: GameState): OpeningObjective | null {
  if (!state.opening || state.opening.complete) return null;
  return OPENING_OBJECTIVES[state.opening.stage] ?? null;
}

export function openingStage(state: GameState): number {
  return state.opening?.complete || !state.opening ? OPENING_OBJECTIVES.length : state.opening.stage;
}

export function availableCrops(state: GameState): CropId[] {
  if (!state.opening) return ['wheat', 'potato', 'beans', 'tomato', 'berries', 'pumpkin', 'rice', 'corn', 'carrot'];
  if (state.opening.complete) {
    const cultivated = cultivatedTiles(state);
    const crops: CropId[] = ['wheat', 'potato', 'carrot'];
    if (cultivated >= 24) crops.push('beans');
    if (cultivated >= 40) crops.push('corn');
    if (cultivated >= 55) crops.push('rice');
    if (cultivated >= 75) crops.push('tomato', 'berries', 'pumpkin');
    return crops;
  }
  if (state.opening.stage >= 4) return ['wheat', 'potato', 'carrot'];
  return ['wheat', 'potato'];
}

export function nextCropUnlock(state: GameState): { crop: CropId; at: number; current: number } | null {
  if (!state.opening || !state.opening.complete) return null;
  const current = cultivatedTiles(state);
  if (current < 24) return { crop: 'beans', at: 24, current };
  if (current < 40) return { crop: 'corn', at: 40, current };
  if (current < 55) return { crop: 'rice', at: 55, current };
  if (current < 75) return { crop: 'tomato', at: 75, current };
  return null;
}

export function operationsAvailable(state: GameState): boolean {
  return !state.opening || state.opening.complete || state.opening.stage >= 4;
}

export function irrigationAvailable(state: GameState): boolean {
  return !state.opening || (state.opening.complete && activeCrops(state) >= 12);
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
  if (opening.stage === 1) {
    next.seeds.wheat += 2;
    next.seeds.potato += 2;
  }
  if (opening.stage === 2) next.gold += 25;
  if (opening.stage === 4) next.seeds.carrot += 4;

  return { state: next, completed: objective };
}
