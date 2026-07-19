import { CropId, GameState, PlayerAction } from '../types';
import { activeCrops, cultivatedTiles, laborProgress } from './toolProgression';
import { MILL_UNLOCK_WHEAT } from '../balance';

export interface OpeningObjective {
  title: string;
  instruction: string;
  target: number;
  reward: string;
}

export const OPENING_OBJECTIVES: OpeningObjective[] = [
  { title: 'Reclaim your field', instruction: 'Clear 3 patches of brush', target: 3, reward: '12 wood' },
  { title: 'Prepare a crop bed', instruction: 'Till 6 open tiles', target: 6, reward: '4 potato seeds' },
  { title: 'Plant your first field', instruction: 'Plant 6 wheat or potatoes', target: 6, reward: '4 more seeds' },
  { title: 'Care for the field', instruction: 'Water 6 planted tiles', target: 6, reward: '25 gold' },
  { title: 'Bring in the old crop', instruction: 'Harvest the 3 ready wheat plots', target: 3, reward: 'Roadside orders' },
  { title: 'Earn your first money', instruction: 'Take wheat to the farm-gate stand and sell it', target: 1, reward: 'Carrots and an open farm' },
];

const ACTION_FOR_STAGE: PlayerAction['type'][] = [
  'clearLand',
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
  return !state.opening || state.opening.complete || state.opening.stage >= 5;
}

export function millAvailable(state: GameState): boolean {
  return state.mill.commissioned || state.production.harvestedWheat >= MILL_UNLOCK_WHEAT;
}

export interface FarmGoal {
  title: string;
  progress: number;
  target: number;
  reward: string;
}

export function farmGoals(state: GameState): FarmGoal[] {
  if (!state.opening?.complete) return [];
  const cultivated = cultivatedTiles(state);
  const crops = activeCrops(state);
  const labor = laborProgress(state);
  const goals: FarmGoal[] = [];
  if (crops < 12) goals.push({ title: 'Grow a working field', progress: crops, target: 12, reward: 'Irrigation plans' });
  if (cultivated < 24) goals.push({ title: 'Expand cultivation', progress: cultivated, target: 24, reward: 'Beans and row-tool paths' });
  if (state.production.harvestedWheat < MILL_UNLOCK_WHEAT) goals.push({ title: 'Prove the grain crop', progress: state.production.harvestedWheat, target: MILL_UNLOCK_WHEAT, reward: 'Flour mill plans' });
  if (labor.manualTills < 16) goals.push({ title: 'Work the soil by hand', progress: labor.manualTills, target: 16, reward: 'Row plow offer' });
  if (state.reputation < 2) goals.push({ title: 'Serve local buyers', progress: state.reputation, target: 2, reward: 'Better farm orders' });
  return goals.slice(0, 3);
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

  if (opening.stage === 1) next.seeds.potato += 4;
  if (opening.stage === 2) {
    next.seeds.wheat += 2;
    next.seeds.potato += 2;
  }
  if (opening.stage === 3) next.gold += 25;
  if (opening.stage === 5) next.seeds.carrot += 4;

  return { state: next, completed: objective };
}
