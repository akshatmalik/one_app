import { GameState, ProductionMilestoneId } from '../types';

export function syncProductionMilestones(state: GameState): void {
  const earned = new Set<ProductionMilestoneId>(state.production.milestones);
  if (state.production.harvestedWheat > 0) earned.add('firstHarvest');
  if (state.production.automatedWaterings >= 6) earned.add('reliableWater');
  if (state.production.wheatStorageCapacity > 12) earned.add('bufferStock');
  if (state.production.wheatMilled > 0) earned.add('firstFlour');
  if (state.production.flourExported >= 3) earned.add('exportOperation');
  state.production.milestones = [...earned];
}

export function millStatus(state: GameState): string {
  if (!state.mill.commissioned) return 'Foundation awaiting restoration';
  if (state.mill.output >= state.mill.outputCapacity) return 'Output full - export flour';
  if (state.mill.output > 0 && state.mill.input === 0) return `${state.mill.output} flour ready - export or load more wheat`;
  if (state.mill.input === 0) return 'Idle - load stored wheat';
  return `Working at dawn: up to ${state.mill.ratePerDay} flour`;
}
