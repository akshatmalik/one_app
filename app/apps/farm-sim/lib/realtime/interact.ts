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
  targetIdx?: number
): PlayerAction | null {
  const idx = targetIdx !== undefined ? targetIdx : facingTileIdx(player, GRID_SIZE);
  if (idx === null) return null;

  const tile = state.tiles[idx];
  if (!tile) return null;

  switch (player.tool as ToolId) {
    case 'hoe':
      return { type: 'till', idx };

    case 'can':
      if (player.waterCharges > 0) return { type: 'water', idx };
      return null;

    case 'seeds':
      if (selectedCrop !== null) return { type: 'plant', idx, crop: selectedCrop };
      return null;

    case 'hand':
      return { type: 'harvest', idx };

    case 'builder':
      // Builder actions are handled separately through the BuildPanel overlay.
      return null;

    case 'tractor':
      if (state.upgrades.includes('tractor') && (state.items['fuel'] ?? 0) > 0) {
        return { type: 'tillArea', idx };
      }
      break;

    case 'seeder':
      if (state.upgrades.includes('seeder') && (state.items['fuel'] ?? 0) > 0 && selectedCrop !== null) {
        return { type: 'plantArea', idx, crop: selectedCrop };
      }
      break;
  }

  return null;
}
