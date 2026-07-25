import { GameState, PlayerAction } from './types';
import { GRID_SIZE } from './balance';

export interface WorkOrder {
  id: string;
  action: PlayerAction;
  targetIdx: number;
  durationMs: number;
  label: string;
  batchId?: string;
  batchLabel?: string;
}

export function actionTarget(action: PlayerAction): number | null {
  return 'idx' in action && Number.isInteger(action.idx) ? action.idx : null;
}

export function workDuration(state: GameState, action: PlayerAction, targetIdx: number): number {
  const tile = state.tiles[targetIdx];
  switch (action.type) {
    case 'plant': return 700;
    case 'water': return 800;
    case 'harvest': return 1000;
    case 'till': return 1200;
    case 'refillCan': return 1500;
    case 'clearLand': return tile?.kind === 'tree' ? 3500 : 2500;
    case 'mine': return 4000;
    case 'tillRow':
    case 'plantRow':
    case 'waterRow':
    case 'harvestRow':
      return 1800;
    case 'tillArea':
    case 'plantArea':
    case 'harvestArea':
      return 2500;
    case 'buildChannel':
    case 'buildSprinkler':
    case 'buildFieldCrate':
    case 'digWell':
    case 'buildExtractor':
    case 'demolish':
      return 3500;
    default:
      return 900;
  }
}

export function workLabel(state: GameState, action: PlayerAction, targetIdx: number): string {
  const tile = state.tiles[targetIdx];
  switch (action.type) {
    case 'till': return 'Till soil';
    case 'plant': return `Plant ${action.crop}`;
    case 'water': return 'Water crop';
    case 'harvest': return 'Harvest crop';
    case 'clearLand': return tile?.kind === 'tree' ? 'Chop tree' : 'Clear brush';
    case 'mine': return 'Break deposit';
    case 'refillCan': return 'Refill can';
    case 'tillRow': return 'Till row';
    case 'plantRow': return `Plant ${action.crop} row`;
    case 'waterRow': return 'Water row';
    case 'harvestRow': return 'Harvest row';
    case 'tillArea': return 'Tractor till';
    case 'plantArea': return `Seed ${action.crop} area`;
    case 'harvestArea': return 'Tractor harvest';
    case 'buildChannel': return 'Build channel';
    case 'buildSprinkler': return 'Build sprinkler';
    case 'buildFieldCrate': return 'Build field crate';
    case 'digWell': return 'Dig well';
    case 'buildExtractor': return 'Build extractor';
    case 'demolish': return 'Remove structure';
    default: return 'Farm work';
  }
}

export function makeWorkOrder(
  state: GameState,
  action: PlayerAction,
  targetIdx: number,
  id: string,
  batch?: { id: string; label: string },
): WorkOrder {
  return {
    id,
    action,
    targetIdx,
    durationMs: workDuration(state, action, targetIdx),
    label: workLabel(state, action, targetIdx),
    batchId: batch?.id,
    batchLabel: batch?.label,
  };
}

/** Greedy nearest-next ordering keeps scattered cleanup and rectangular fields efficient. */
export function sortWorkTargets(indices: number[], startIdx: number): number[] {
  const remaining = [...new Set(indices)].sort((a, b) => a - b);
  const sorted: number[] = [];
  let current = startIdx;
  while (remaining.length) {
    const currentRow = Math.floor(current / GRID_SIZE);
    const currentCol = current % GRID_SIZE;
    let bestAt = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const idx = remaining[i];
      const distance = Math.abs(Math.floor(idx / GRID_SIZE) - currentRow) + Math.abs(idx % GRID_SIZE - currentCol);
      if (distance < bestDistance || (distance === bestDistance && idx < remaining[bestAt])) {
        bestDistance = distance;
        bestAt = i;
      }
    }
    current = remaining.splice(bestAt, 1)[0];
    sorted.push(current);
  }
  return sorted;
}

export function workQueueStorageKey(seed: number): string {
  return `farm-work-queue-v1-${seed}`;
}
