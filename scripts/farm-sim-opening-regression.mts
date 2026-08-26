import assert from 'node:assert/strict';
import { newGame } from '../app/apps/farm-sim/lib/engine/newGame';
import { applyAction } from '../app/apps/farm-sim/lib/engine/actions';
import { advanceOpening, reconcileOpening } from '../app/apps/farm-sim/lib/engine/opening';
import { PlayerAction } from '../app/apps/farm-sim/lib/types';
import { sortWorkTargets, workDuration } from '../app/apps/farm-sim/lib/workOrders';

let state = newGame(4242);

function perform(action: PlayerAction) {
  const result = applyAction(state, action);
  assert.equal(result.ok, true, result.error);
  state = advanceOpening(result.state, action).state;
}

const readyWheat = state.tiles
  .map((tile, idx) => tile.crop?.mature && tile.crop.cropId === 'wheat' ? idx : -1)
  .filter((idx) => idx >= 0);
assert.equal(readyWheat.length, 3);
readyWheat.forEach((idx) => perform({ type: 'harvest', idx }));
assert.equal(state.opening?.stage, 0, 'early harvesting must not skip earlier teaching steps');
assert.equal(state.opening?.activity?.harvest, 3);

state.tiles
  .map((tile, idx) => tile.kind === 'brush' ? idx : -1)
  .filter((idx) => idx >= 0)
  .slice(0, 3)
  .forEach((idx) => perform({ type: 'clearLand', idx }));
assert.equal(state.opening?.stage, 1);

const beds = state.tiles
  .map((tile, idx) => tile.kind === 'grass' ? idx : -1)
  .filter((idx) => idx >= 0)
  .slice(0, 6);
beds.forEach((idx) => perform({ type: 'till', idx }));
assert.equal(state.opening?.stage, 2);
beds.forEach((idx) => perform({ type: 'plant', idx, crop: 'wheat' }));
assert.equal(state.opening?.stage, 3);
beds.forEach((idx) => perform({ type: 'water', idx }));
assert.equal(state.opening?.stage, 5, 'recorded early harvest should complete the later harvest objective');

perform({ type: 'sell', crop: 'wheat', qty: 1 });
assert.equal(state.opening?.complete, true);

const repaired = reconcileOpening({
  ...newGame(99),
  opening: { stage: 4, progress: 0, complete: false },
  labor: { manualTills: 6, manualPlants: 6, manualWaterings: 6, manualHarvests: 3 },
}).state;
assert.equal(repaired.opening?.stage, 5, 'legacy saves must repair immediately when loaded');

const treeIdx = state.tiles.findIndex((tile) => tile.kind === 'tree');
assert.ok(treeIdx >= 0);
assert.equal(workDuration(state, { type: 'clearLand', idx: treeIdx }, treeIdx), 3500);

const sorted = sortWorkTargets([42, 41, 82, 81], 40);
assert.deepEqual(sorted, [41, 42, 82, 81]);

console.log('farm opening regression passed');
