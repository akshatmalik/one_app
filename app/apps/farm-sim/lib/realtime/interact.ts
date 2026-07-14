// ============================================================================
// Farm Sim — Tool → PlayerAction mapping.
// Given the player's current state + the game state, return the action to fire
// when the player presses the action button.
// ============================================================================

import { PlayerState, ToolId, facingTileIdx } from './player';
import { GameState, PlayerAction, CropId } from '../types';
import { GRID_SIZE } from '../balance';

export function toolToAction(
  player: PlayerState,
  state: GameState,
  selectedCrop: CropId | null,
): PlayerAction | null {
  const idx = facingTileIdx(player, GRID_SIZE);
  if (idx === null) return null;

  const tile = state.tiles[idx];
  if (!tile) return null;

  switch (player.tool as ToolId) {
    case 'hoe':
      if (tile.kind === 'grass') return { type: 'till', idx };
      break;

    case 'can':
      if (tile.kind === 'tilled' && player.waterCharges > 0)
        return { type: 'water', idx };
      break;

    case 'seeds':
      if (tile.kind === 'tilled' && tile.crop === null && selectedCrop !== null)
        return { type: 'plant', idx, crop: selectedCrop };
      break;

    case 'hand':
      if (tile.crop?.mature) return { type: 'harvest', idx };
      break;

    case 'builder':
      // Builder actions are handled separately through the BuildPanel overlay.
      return null;
  }

  return null;
}
